import express from 'express'
import cors from 'cors'
import routesLogins from './routes/login'
import routesUsuarios from './routes/usuarios'
import routesBarbearias from './routes/barbearias'
import routesBarbeiros from './routes/barbeiros'
import routesServicos from './routes/servicos'
import routesAgendamentos from './routes/agendamentos'
import routesHorarios from './routes/horarios'
import dotenv from 'dotenv';
dotenv.config();

const app = express()
const port = 3000

app.use(express.json())
app.use(cors())

app.use("/login",         routesLogins)
app.use("/usuarios",      routesUsuarios)
app.use("/barbearias",    routesBarbearias)
app.use("/barbeiros",     routesBarbeiros)
app.use("/servicos",      routesServicos)
app.use("/agendamentos",  routesAgendamentos)
app.use("/horarios",      routesHorarios)

app.get('/', (req, res) => {
  res.send('API: BarberHub')
})

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`)
})