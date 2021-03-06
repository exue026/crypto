import express from 'express'
import path from 'path'
import logger from 'morgan'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'
import session from 'express-session'
import passport from './passport'
const MongoStore = require('connect-mongo')(session)

import api from './api'
import jobs from './jobs'
import CONFIG from './config'

const app = express()
const port = process.env.PORT || 8000;

/* Only server static assets in production */
if (process.env.NODE_ENV === 'production') {
  const filePath = path.join(__dirname, '../client/build')
  app.use(express.static(filePath))
}

/* connect to MongoDB */
mongoose.connect(CONFIG.MONGO_URL)

/* debug messages in the console */
app.use(logger('dev'))

/* parse http request body */
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

/* authentication */
app.use(session({
  secret: 'keyboard cat',
  store: new MongoStore({ mongooseConnection: mongoose.connection }),
  resave: false,
  saveUninitialized: false,
}))
app.use(passport.initialize());
app.use(passport.session());

/* main route */
app.use('/api', api)

/* catch 404 */
app.use((req, res, next) => {
  const error = new Error('Not Found')
  error.status = 404
  next(error)
})

/* error handler */
app.use((error, req, res, next) => {
  console.log(`*** ${error} ***`)
  res.locals.message = error.message
  res.locals.error = req.app.get('env') === 'development' ? error : {}
  res.status(error.status || 500)
  res.send(`<html><h1>${error.message}</h1></html>`)
})

app.listen(port, () => console.log(`Server listening on port ${port}`));
