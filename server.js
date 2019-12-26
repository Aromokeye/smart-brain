const express = require('express')
const bodyParser = require('body-parser')
const bcrypt = require('bcryptjs');
const cors = require('cors')
const clarifai =require('clarifai')
const knex =  require('knex')({
    
        client: 'pg',
        connection: {
          host : '1postgresql-asymmetrical-29859',
          user : 'postgres',
          password : 'Ore',
          database : 'smart-brain'
        }
      });
knex.select('*').from('users')

//clarifai API key
const ap = new Clarifai.App({
    apiKey: 'e3ceb1096df9432c8b08ead4a58b0010'
   });


const app = express()
app.use(bodyParser.json())
app.use(cors())


//bcrypt


// Load hash from your password DB.
//bcrypt.compare("B4c0/\/", hash, function(err, res) {
    // res === true
//});
//bcrypt.compare("not_bacon", hash, function(err, res) {
    // res === false
//});
 
// As of bcryptjs 2.4.0, compare returns a promise if callback is omitted:
//bcrypt.compare("B4c0/\/", hash).then((res) => {
    // res === true
//});


//routes implementations 
app.get('/', (req, res)=>{       
    res.send('its working')
})

app.post('/signin', (req, res)=>{
    knex.select('email', 'hash').from('login')
        .where('email', '=', req.body.email)
        .then(data=>{
            const isvalid = bcrypt.compareSync(req.body.password, data[0].hash)
            if(isvalid){
                return knex.select('*').from('users')
                        .where('email', '=', req.body.email)
                        .then(user=>{
                            res.json(user[0])
                        })
                        .catch(err =>res.status(400).json('bad request'))
            }else {
                res.status(400).json('wrong credentials')
            }
        })
        .catch(err=> res.status(400).json('wrong credentials'))
})

app.post('/register', (req, res)=>{
    const {name, email, password} = req.body
    if(!name || !email || !password){
        return res.status(400).json('Bad form submission')
    }
    let hash = bcrypt.hashSync(password)
    knex.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {

            return trx('users').returning('*').insert({
                email: loginEmail[0],
                name: name,
                joined: new Date()
                }).then(user => {
                res.json(user[0])
                })
            
                    })
                .then(trx.commit)
                .catch(trx.rollback)
                })
                .catch(err => res.status(400).json('bad request'))
})

app.get('/profile/:id', (req, res)=> {
    const { id } = req.params
    //let found = false
    knex.select('*').from('users').where({
        id: id
    }).then(user=>{
        if (user.length){
            res.json(user[0])
        }else{
            res.status(400).json('not found')
        }
    
    }).catch(err => res.status(400).json(err))
    
})

app.put('/image', (req, res)=>{
    const { id } = req.body
    knex('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => { 
        res.json(entries[0])
    }).catch(err => res.status(400).json(err))

    ap.models.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
    .then(data=> res.json(data))
    .catch(res=> res.status(400).json('nothing could be provided'))
    
    
})

app.listen(process.env.PORT || 3000, ()=>{
    console.log(`Our app is listening on port ${process.env.PORT}`)
}) 