const express = require('express')
const compression = require('compression')
const auth = require('express-basic-auth')
const ssl = require('heroku-ssl-redirect')

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
app.use(compression({
  filter: function(req, res) {
    if (req.headers['x-no-compression']) return false
    return compression.filter(req, res)
  }
}))
app.use(express.static('.', {
  maxage: '2w'
}))

app.listen(port)
