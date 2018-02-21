const sqlite3 = require('sqlite3').verbose(), // Add more info to db stack trace.
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

const BASE_API_URL = 'http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1';
const ERROR_MESSAGE = "Error: Missing Key";

const db = new sqlite3.Database('./db/database.db', sqlite3.OPEN_READONLY, err => {
  if (err) {
    console.error(err.stack);
  }
  else {
    console.log("Successfully conntected to Database");
  }
});


// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });


app.use((req, res, next) => {
  res.set('Content-Type', 'application/json');
  next();
})

  // ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);
app.get('*', (req, res) => {
  res.status(404).json({ message: 'Page not found!'});
});


// ROUTE HANDLER
function getFilmRecommendations(req, res) {

  
  // Get the id of the parent movie from URI
  let filmId = req.params.id;
  // errorHandler(filmId, 'Film ID');

  // Set limit value 
  let limit = req.query.limit || 10;

  // Set offset value
  let offset = req.query.offset || 0;

  // First find movie by its id 
  db.get('SELECT id, title, genre_id FROM films WHERE id = $id', {$id: filmId}, 
    (err, row) => {
      if(err || !row) {
       return res.status(422).json({ message: 'Error: Invalid Film ID'});
      }
      // res.status(200).json({film: row});
      // console.log(row);

      // This query returns the id, title, release date and genre of ALL the movies that has the same genre and it's within 15 years before and after the parent film's release date orderd by film id.  
      db.all(`SELECT films.id, films.title, films.release_date, films.genre_id, genres.name FROM films
              INNER JOIN genres ON films.genre_id = genres.id
              WHERE genre_id = (SELECT genre_id FROM films WHERE id = $id)
              AND films.release_date >= date((SELECT films.release_date FROM films WHERE id = $id), '-15 years')
              AND films.release_date <= date((SELECT films.release_date FROM films WHERE id = $id), '+15 years')
              AND films.id <> $id
              ORDER BY films.id ASC`,
              {$id: filmId}, (err, rows) => {
    
                if(err || !rows) {
                  return res.status(422).json({message: ERROR_MESSAGE});
                }

                // Assign rows to filmList for readability
                const filmList = rows;

                // Get the IDs of the filmList to an array and transform into a string
                // to be added as query param for the 3rd pary URI
                const filmIDList = filmList.map(film => {
                  return film.id;
                }).join(',');

                // Build the URI for the 3rd party API request 
                const apiRequestURI = {
                  uri: BASE_API_URL + "?films=" + filmIDList,
                  json: true
                }

                // Send the request to 3rd party API
                request.get(apiRequestURI, (err, response, body) => {
                  if(err || !body) {
                    return res.status(422).json({message: 'Error retrieving reviews for this film Id'});
                  }

                  const reviews = body;
                  let recommendations =[];
                  
                  // Get the number of reviews
                  // Get the average ratings from the reviews. 
                  // Add reviews from 3rd party api to the results list,
                  // according with criteria min 5 reviews and average rating above 4.0
                  for(let k = 0; k < reviews.length; k++) {

                    const numReviews = reviews[k].reviews.length;
                    if(numReviews >= 5) {
                      
                      const avgRating = getAvgRatings(reviews[k].reviews);
                      if(avgRating > 4.0) {

                        recommendations.push({
                          id: filmList[k].id,
                          title: filmList[k].title,
                          releaseDate: filmList[k].release_date,
                          genre: filmList[k].name,
                          averageRating: avgRating,
                          reviews: numReviews
                        });

                      } // end if avgRatigns
                    } // end if numReviews
                  } // end of for loop

                  // Sorting recommendations by ID 
                  recommendations.sort(function(a, b) {
                    return a.id - b.id;
                  });

                  // Sending results to the client 
                  return res.json({
                    recommendations: recommendations.slice(offset, offset + limit),
                    meta: {
                      limit: limit, 
                      offset: offset
                    }
                  });

                }); // end of request
      }); // end of db.all
  }); // end of db.get

  // Helper method get the average rating for each review. 
  function getAvgRatings(reviews) {
    let sumOfReviews = 0.0;
    let numOfReviews = reviews.length;
    
    reviews.forEach( review => {
      sumOfReviews += review.rating;
    });
    return parseFloat((sumOfReviews / numOfReviews).toFixed(2));
  }

  // Helper function to handle error 
  function errorHandler(value, type) {
    if(isNaN(parseInt(value) || !value)) {
      return res.sendStatus(422).json({message: `Error: ${type} ${value} value is not valid!`});
    }
  }
}

module.exports = app;
