const sqlite3 = require('sqlite3').verbose(),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

const BASE_API_URL = 'http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1';

const db = new sqlite3.Database('./db/database.db', sqlite3.OPEN_READONLY, err => {
  if (err) throw err; 
  console.log("Successfully connected to Database");
});

// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);


// ROUTE HANDLER
function getFilmRecommendations(req, res) {

  /**
   * TODO: 1. Recommended films must have:
   * DONE: The same genre as the parent film
   * IMPLEMENT: A mininum of 5 reviews
   * IMPLEMENT: An average rating greater than 4.0
   * DONE: Been released within 15 years, before or after the
   * the parent film
   * IMPLEMENT: A sort order based on film id (order by film id)
   */

   /**
    * TODO: 2. The application should allow developers to:
    * DONE: Paginate by offset
    * DONE: Limit the number of returned records
    */

    /**
     * TODO: 3. The application should handler for:
     * IMPLEMENT: Client/server failure
     * IMPLEMENT: Missing routes
     */

  // res.status(500).send('Not Implemented');
  
  // Get the id of the parent movie from URI
  let id = req.params.id;
  
  // Default limit value 
  let limit = 10;

  // Default offset value 
  let offset = 0


  // This query returns the id, title, release date and genre of ALL the movies that has the same genre and it's within 15 years before and after the parent film's release date.
  db.all(
    `SELECT films.id, films.title, films.release_date AS releaseDate, genres.name AS genre FROM films 
    INNER JOIN genres ON films.genre_id = genres.id
    WHERE genre_id = (SELECT genre_id FROM films WHERE id = $id) 
    AND
      films.release_date >= date((SELECT films.release_date FROM films WHERE id = $id),'-15 years') 
    AND
      films.release_date <= date((SELECT films.release_date FROM films WHERE id = $id), '+15 years')`,{$id: id}, (err, rows) => {
        if(err) console.error(err.message);
        
        if(rows === undefined) {
          return res.json({message: 'No film with id: ' + id + '.'});
        } 
        
        //res.status(200).send(rows);
        fetchReviewsFromAPI(rows);
        //console.log(row);
        
  });
}

// This helper function will retrieve the ratings and Review from the third party API
function fetchReviewsFromAPI(filmList) {

  // Get ids of the filmList and transform the array into a string
  const filmIDList = filmList.map(film => {
    return film.id;
  }).join(',');

  // Build the URI for the API request
  let apiRequestInfo = {
    uri: BASE_API_URL + '?films=' + filmIDList,
    json: true
  };
  
  request.get(apiRequestInfo, (err, res, body)=> {
    let reviews = res.body;

    // this loop iterates throught the filmList and search
    // for films which has a minimum of 5 reviews and a 
    // average ratings greater than 4.0.
    for(let k = 0; k < filmList; k++) {
      if(filmList[k].id === reviews[k].film_id) {
        let avgRatings = getAvgRatings(reviews[k].reviews)
        if(reviews[k].reviews.length >= 5 && avgRatings > 4.0) {
          filmList[k].reviews = reviews[k].reviews;
          filmList[k].avgRatings = getAvgRatings;
        }
      }
    }

    // Handles offset, limit and response in json format
    res.json({
      recomendations: filmList.slice(offset, offset+limit),
      meta: {limit: limit, offset: offset}
    });



  })
}

// Helper method get the average rating for each review. 
function getAvgRatings(reviews) {
  let sumOfReviews = 0.0;
  let numOfReviews = reviews.length;
  
  reviews.forEach(review => {
    total += review.rating;
  });


  return sumOfReviews / numOfReviews;
}
module.exports = app;
