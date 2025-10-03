const whitelist= [
    'http://localhost:3000',   
    'https://myapp.com',       
    'https://admin.myapp.com'
] 

const corsOptions= {
    origin: (origin,callback) => {
        if(!origin) return callback(null,true)
        if(whitelist.includes(origin)){
            return callback(null,true)
        }else {
            return callback(null,false)
        } 
    },
    methods: ['GET','POST','UPDATE','PUT','DELETE'],
    credentials: true,
}


module.exports= corsOptions