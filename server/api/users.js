import express from 'express'
import mongoose from 'mongoose'

import {
  ensureAuthenticated,
  ensureObjectIdFormat,
} from '../middleware'

import { getCoin } from '../data/coin-market-cap'

import Game from '../models/game'
import User from '../models/user'

const router = express.Router()

/* get all games of a user */
router.get('/:userId/games',
  ensureAuthenticated,
  ensureObjectIdFormat('userId'),
  async(req, res, next) => {
    try {
      const user = await User.findById(req.params.userId)
      const games = []
      for (let game of user.games) {
        const gameData = await Game.findById(game._id)
        games.push(Object.assign({}, gameData._doc))
      }
      res.send({ data: games, })
    } catch (error) {
      console.log(error)
      res.status(500).send({ error, })
    }
})

/* get basic info of a game */
router.get('/:userId/games/:gameId',
  ensureAuthenticated,
  ensureObjectIdFormat('userId'),
  async(req, res, next) => {
    try {
      const user = await User.findOne({ _id: req.params.userId })
      for (let game of user.games) {
        // Current budget, number of trades, number of coins currently holding
        if (game._id.toString() === req.params.gameId) {
          res.send({ game: {
            budget: game.budget,
            numTransactions: game.numTransactions,
            numCoins: game.coins.length,
          }})
        }
      }
    } catch(err) {
      console.log(err)
      res.status(500).send({ err: err })
    }
  })

/* create a game */
router.post('/:userId/games',
  ensureAuthenticated,
  ensureObjectIdFormat('userId'),
  async(req, res, next) => {
    const {
      gameName,
      startDate,
      endDate,
      createdBy,
      playerIds,
      startingBudget,
    } = req.body
    let gameId = mongoose.Types.ObjectId()
    try {
      const newGame = new Game({
        _id: gameId,
        name: gameName,
        start: startDate,
        end: endDate,
        createdBy: createdBy,
        players: [mongoose.Types.ObjectId(req.params.userId)],
        startingBudget: startingBudget,
      })
      const results = await newGame.save()
    } catch (err) {
      console.log(err)
      res.status(500).send({ err, })
    }
    for (let playerId of playerIds) {
      await User.update({ _id: mongoose.Types.ObjectId(playerId) }, {
        $push: {
          games: {
            _id: gameId,
            budget: startingBudget,
            coins: [],
          }
        }
      })
    }
    res.send()
  })

/* user purchases a coin */
router.put('/:userId/games/:gameId/coins',
  //ensureAuthenticated,
  ensureObjectIdFormat('userId'),
  async(req, res, next) => {
  const {
    name,
    purchasedPrice,
    quantity
  } = req.body
  const query = {
    '_id': req.params.userId,
    'games._id': req.params.gameId,
  }
  try {
    const user = await User.findOne(query)
    for (let i = 0; i < user.games.length; i++) {
      if (user.games[i]._id.toString() === req.params.gameId) {
        user.games[i].numTransactions++
        user.games[i].budget -= (purchasedPrice * quantity)
        user.games[i].coins.push({
          _id: mongoose.Types.ObjectId(),
          coin_id: name,
          purchasedPrice: purchasedPrice,
          quantity: quantity,
          purchasedTime: new Date(),
        })
      }
    }
    await user.save()
  } catch (err) {
    console.log(err)
    res.status(500).send({ err: err.error })
  }
  res.send()
})

/* user sells a coin */
router.post('/:userId/games/:gameId/coins',
  ensureAuthenticated,
  ensureObjectIdFormat('userId'),
  async(req, res, next) => {
  const {
    investmentId,
    currPrice,
    quantity,
  } = req.body
  const query = {
    "_id": req.params.userId,
  }
  try {
    const user = await User.findOne(query)
    for (let i = 0; i < user.games.length; i++) {
      if (user.games[i]._id.toString() === req.params.gameId){
        user.games[i].numTransactions++
        for (let j = 0; j < user.games[i].coins.length; j++) {
          let coins = user.games[i].coins
          if (coins[j]._id.toString() === investmentId) {
            user.games[i].budget += (quantity * (currPrice - coins[j].purchasedPrice))
            coins[j].quantity -= quantity
            if (coins[j].quantity <= 0) {
              user.games[i].coins.splice(j, 1)
            }
            break
          }
        }
      }
    }
    user.save()
  } catch (err) {
    res.status(500).send({ err: err.error })
  }
  res.send()
})

/* get all coins of a user */
router.get('/:userId/games/:gameId/coins',
  ensureAuthenticated,
  ensureObjectIdFormat('userId'),
  async(req, res, next) => {
    let games
    try {
      const user = await User.findOne({ _id: req.params.userId })
      games = user.games
    } catch (err) {
      console.log(err)
      res.send({ err, })
    }
    let coins
    for (let game of games) {
      if (game._id.toString() === req.params.gameId) {
        coins = game.coins
      }
    }
    const coinData = []
    for (let coin of coins) {
      const marketInfo = await getCoin(coin.coin_id)
      const {
        purchasedPrice,
        purchasedTime,
        quantity,
      } = coin._doc
      coinData.push(Object.assign({
        purchasedPrice,
        purchasedTime,
        quantity,
      }, marketInfo))
    }
    res.send({ coins: coinData })
  })

export default router
