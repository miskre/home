const express = require('express')
const compression = require('compression')
const auth = require('express-basic-auth')
const ssl = require('heroku-ssl-redirect')

express.compress({
  filter: function (req, res) {
    return true
  }
})

const port = process.env.PORT || 3000
const app = express()

app.use(ssl())
// app.use(auth({
//   users: {
//     'mis': 'kre',
//     'gia': ''
//   },
//   challenge: true
// }))
app.use(compression())
app.use(express.static('.', {
  maxage: '2h'
}))

app.listen(port)
