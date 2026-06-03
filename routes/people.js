import express from 'express'

import db from '../db.js'

const router = express.Router()

/* GET lista de pessoas. */
router.get('/', async (req, res, next) => {
  try {
    const [people] = await db.execute({
      sql: 'SELECT * FROM person LEFT OUTER JOIN zombie ON eatenBy = zombie.id',
      // nestTables resolve conflitos de haver campos com mesmo nome nas tabelas
      // nas quais fizemos JOIN (neste caso, `person` e `zombie`).
      // descrição: https://github.com/felixge/node-mysql#joins-with-overlapping-column-names
      nestTables: true
    })

    // Exercício 3: negociação de conteúdo
    res.format({
      html: () => {
        res.render('list-people', {
          people,
          success: req.flash('success'),
          error: req.flash('error')
        })
      },
      json: () => {
        res.json({ people })
      }
    })
  } catch (error) {
    console.error(error)
    error.friendlyMessage = 'Problema ao recuperar pessoas'
    next(error)
  }
})

/* PUT altera pessoa para morta por um certo zumbi */
router.put('/eaten/', async (req, res, next) => {
  const zombieId = req.body.zombie
  const personId = req.body.person

  if (!zombieId || !personId) {
    req.flash('error', 'Nenhum id de pessoa ou zumbi foi passado!')
    res.redirect('/')
    return
  }

  try {
    const [result] = await db.execute(
      `UPDATE person
       SET alive=false, eatenBy=?
       WHERE id=?`,
      [zombieId, personId]
    )

    if (result.affectedRows !== 1) {
      req.flash('error', 'Não há pessoa para ser comida.')
    } else {
      req.flash('success', 'A pessoa foi inteiramente (não apenas cérebro) engolida.')
    }
  } catch (error) {
    req.flash('error', `Erro desconhecido. Descrição: ${error}`)
  } finally {
    res.redirect('/')
  }
})

/* GET formulario de registro de nova pessoa */
router.get('/new/', (req, res) => {
  res.render('new-person', {
    success: req.flash('success'),
    error: req.flash('error')
  })
})

/* POST registra uma nova pessoa */
router.post('/', async (req, res, next) => {
  const name = req.body.name

  if (!name || name.trim() === '') {
    req.flash('error', 'O nome da pessoa não pode ficar vazio.')
    res.redirect('/people/new')
    return
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO person (name, alive, eatenBy) VALUES (?, true, NULL)',
      [name.trim()]
    )

    if (result.affectedRows === 1) {
      req.flash('success', `Pessoa "${name.trim()}" registrada com sucesso no jardim.`)
    } else {
      req.flash('error', 'Não foi possível registrar a nova pessoa.')
    }

    res.redirect('/people')
  } catch (error) {
    console.error(error)
    req.flash('error', `Erro ao registrar pessoa. Descrição: ${error.message}`)
    res.redirect('/people/new')
  }
})

/* DELETE uma pessoa */
router.delete('/:id', async (req, res, next) => {
  const personId = req.params.id

  if (!personId) {
    req.flash('error', 'Nenhum id de pessoa foi passado.')
    res.redirect('/people')
    return
  }

  try {
    const [result] = await db.execute(
      'DELETE FROM person WHERE id=?',
      [personId]
    )

    if (result.affectedRows === 1) {
      req.flash('success', 'Pessoa excluída com sucesso do jardim.')
    } else {
      req.flash('error', 'Não foi encontrada nenhuma pessoa com esse id.')
    }

    res.redirect('/people')
  } catch (error) {
    console.error(error)
    req.flash('error', `Erro ao excluir pessoa. Descrição: ${error.message}`)
    res.redirect('/people')
  }
})

export default router