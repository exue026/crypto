import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'

import Table from '../../shared/views/table'

class Coins extends Component {
  render() {
    return (
      <Table
        header={['Name']}
        data={this.props.coins}
      />
    )
  }
}

Coins.propTypes = {
  coins: PropTypes.array.isRequired,
}

const mapStateToProps = ({ gamePage }) => ({
  coins: gamePage.allCoins,
})

const mapDispatchToProps = dispatch => bindActionCreators({
}, dispatch)

export default connect(mapStateToProps, mapDispatchToProps)(Coins)
