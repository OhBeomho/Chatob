import { Router } from 'express'
import { Account } from '../database.mjs'

const router = Router()

router
	.route('/login')
	.get((_, res) => res.render('login.html'))
	.post((req, res) => {
		const { id, password } = req.body

		Account.login(id, password)
			.then(() => {
				req.session.user = id
				res.redirect('/')
			})
			.catch((err) => res.render('error', { err }))
	})
router
	.route('/signup')
	.get((_, res) => res.render('signup.html'))
	.post((req, res) => {
		const { id, password } = req.body

		Account.sign_up(id, password)
			.then(() => res.redirect('/login'))
			.catch((err) => res.render('error', { err }))
	})
router.get('/idcheck/:id', (req, res) =>
	Account.id_check(req.params.id)
		.then((unique) => res.send({ unique }))
		.catch((err) => res.status(500).send(err))
)

export default router
