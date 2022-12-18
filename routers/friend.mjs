import { Router } from 'express'
import { Account } from '../database.mjs'

const router = Router()

router.use('/', (req, res, next) => {
	if (!req.session.user) res.redirect('/account/login')
	else next()
})

router.get('/request/:id', (req, res) =>
	Account.friend_request(req.session.user, req.params.id)
		.then(() => res.sendStatus(200))
		.catch((err) => res.status(500).send(err))
)

router.get('/accept/:id', (req, res) =>
	Account.accept_request(req.session.user, req.params.id)
		.then(() => res.sendStatus(200))
		.catch((err) => res.status(500).send(err))
)

router.get('/decline/:id', (req, res) =>
	Account.decline_request(req.session.user, req.params.id)
		.then(() => res.sendStatus(200))
		.catch((err) => res.status(500).send(err))
)

router.get('/remove/:id', (req, res) =>
	Account.remove_friend(req.session.user, req.params.id)
		.then(() => res.sendStatus(200))
		.catch((err) => res.status(500).send(err))
)

export default router
