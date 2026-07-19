import { getDBConnection } from '../db/db.js'

// Maps common subgenre/alias search terms to the store's actual genre categories,
// so searching e.g. "New Wave" still surfaces records tagged "rock".
const SUBGENRE_MAP = {
  'new wave': 'rock',
  'grunge': 'rock',
  'psychedelic rock': 'rock',
  'hard rock': 'rock',
  'garage rock': 'rock',

  'indie rock': 'indie',
  'indie pop': 'indie',
  'lo fi': 'indie',
  'dream pop': 'indie',
  'shoegaze': 'indie',

  'drone': 'ambient',
  'new age': 'ambient',
  'dark ambient': 'ambient',
  'field recording': 'ambient',

  'folk rock': 'folk',
  'americana': 'folk',
  'singer songwriter': 'folk',
  'bluegrass': 'folk',

  'post punk': 'punk',
  'hardcore': 'punk',
  'pop punk': 'punk',
  'ska punk': 'punk',

  'bebop': 'jazz',
  'swing': 'jazz',
  'fusion': 'jazz',
  'free jazz': 'jazz',
  'smooth jazz': 'jazz',

  'techno': 'electronic',
  'house': 'electronic',
  'synthwave': 'electronic',
  'idm': 'electronic',
  'downtempo': 'electronic',

  'r&b': 'soul',
  'funk': 'soul',
  'motown': 'soul',
  'neo soul': 'soul',

  'baroque': 'classical',
  'romantic': 'classical',
  'chamber music': 'classical',
  'opera': 'classical',

  'synth pop': 'pop',
  'synthpop': 'pop',
  'dance pop': 'pop',
  'city pop': 'pop',
  'bubblegum pop': 'pop',

  'thrash metal': 'metal',
  'death metal': 'metal',
  'black metal': 'metal',
  'doom metal': 'metal',

  'delta blues': 'blues',
  'chicago blues': 'blues',
  'blues rock': 'blues',
}

export async function getGenres(req, res) {

  try {

    const db = await getDBConnection()

    const genreRows = await db.all('SELECT DISTINCT genre FROM products')
    const genres = genreRows.map(row => row.genre)
    res.json(genres)

  } catch (err) {

    res.status(500).json({error: 'Failed to fetch genres', details: err.message})

  }
}

export async function getProducts(req, res) {

  try {

    const db = await getDBConnection()

    let query = 'SELECT * FROM products'
    let params = []

    const { genre, search } = req.query
    console.log('genre:', genre, '| search:', search)

    if (genre) {

      query += ' WHERE genre = ?'
      params.push(genre)

    } else if (search) {

      const searchPattern = `%${search}%`
      const mappedGenre = SUBGENRE_MAP[search.trim().toLowerCase()]

      if (mappedGenre) {
        query += ' WHERE genre = ? OR title ILIKE ? OR artist ILIKE ? OR genre ILIKE ?'
        params.push(mappedGenre, searchPattern, searchPattern, searchPattern)
      } else {
        query += ' WHERE title ILIKE ? OR artist ILIKE ? OR genre ILIKE ?'
        params.push(searchPattern, searchPattern, searchPattern)
      }

    }
    console.log('QUERY:', query)
    console.log('PARAMS:', params)

    const products = await db.all(query, params)

    res.json(products)


  } catch (err) {

    res.status(500).json({error: 'Failed to fetch products', details: err.message})

  }

}

export async function getProductById(req, res) {
  try {
    const db = await getDBConnection()
    const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id])

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    res.json(product)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product', details: err.message })
  }
}