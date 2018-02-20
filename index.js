import { error } from 'util';

const sqlite3 = require('sqlite3').verbose(), // Add more info to db stack trace.
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

const BASE_API_URL = 'http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1';
const ERROR_MESSAGE = "Film id not valid or key missing";

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'sqlite',
  storage: './db/database.db'
});

// START SEQUELIZE 
sequelize.authenticate()
  .then(()=> {
    console.log("Successfully connected to Database");
  })
  .catch( err => {
    console.log("Unable to connect to the database");
  })


// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);
app.get('*', (req, res) => {
  res.status(404).json({ message: 'Page not found!'});
});


// ROUTE HANDLER
function getFilmRecommendations(req, res) {

  /**
   * TODO: 1. Recommended films must have:
   * DONE: The same genre as the parent film
   * DONE: A mininum of 5 reviews
   * DONE: An average rating greater than 4.0
   * DONE: Been released within 15 years, before or after the
   * the parent film
   * IMPLEMENT: A sort order based on film id (order by film id)
   */

   /**
    * COMPLETED: 2. The application should allow developers to:
    * DONE: Paginate by offset
    * DONE: Limit the number of returned records
    */

    /**
     * TODO: 3. The application should handler for:
     * DONE: Client/server failure
     * IMPLEMENT: Missing routes
     */

  // res.status(500).send('Not Implemented');
  
  // Get the id of the parent movie from URI
  let filmId = req.params.id;
  
  // Set limit value 
  let limit = req.params.limit || 10;

  // Set offset value
  let offset = req.params.offset || 0;

  // Check for errors
  errorHandler(filmId);
  errorHandler(limit);
  errorHandler(offset);


  // This query returns the id, title, release date and genre of ALL the movies that has the same genre and it's within 15 years before and after the parent film's release date.
  // sequelize.query(`SELECT films.id, films.title, films.release_date AS releaseDate, genres.name AS genre FROM films 
  //   INNER JOIN genres ON films.genre_id = genres.id
  //   WHERE genre_id = (SELECT genre_id FROM films WHERE id = :id) 
  //   AND
  //     films.release_date >= date((SELECT films.release_date FROM films WHERE id = :id),'-15 years') 
  //   AND
  //     films.release_date <= date((SELECT films.release_date FROM films WHERE id = :id), '+15 years')`, {replacements: {id: filmId}, type: sequelize.QueryTypes.SELECT })
  //     .then( results => {
        
  //       // console.log(results);

  //       // Get ids of the filmList and transform the array into a string
  //       const filmIDList = results.map(film => {
  //         return film.id;
  //       }).join(',');
      
  //       // Build the URI for the API request
  //       let apiRequestInfo = {
  //         uri: BASE_API_URL + '?films=' + filmIDList,
  //         json: true
  //       };

  //       // Send request to 3rd party API
  //       request.get(apiRequestInfo, (err, response, body) => {

  //         // Get the list of reviews
  //         let reviews = response.body;

  //         // console.log(reviews);

  //         // Add reviews from 3rd party api to the results list
  //         // Get the number of reviews
  //         // Get the average ratings from the reviews. 
  //         for(let k = 0; k < results.length; k++) {
  //           if(results[k].id === reviews[k].film_id) {
  //             results[k].reviews = reviews[k].reviews.length;
  //             results[k].averageRating = getAvgRatings(reviews[k].reviews);
  //           }
  //         }

  //         // filtering results by review length and average ratings
  //         let filteredResults = results.filter( (result) => {
  //           return result.reviews >= 5 && reviews.getAvgRating > 4.0;
  //         });

  //         // Build the recommended film list
  //         let recommendedFilmList = [];
  //         filteredResults.forEach( film => {
  //           recommendedFilmList.push({
  //             id: film.id,
  //             title: film.title,
  //             releaseDate: film.releaseDate,
  //             genre: film.genre,
  //             averageRating: film.averageRating,
  //             reviews: film.reviews.length
  //           });
  //         });

  //         res.json({
  //           recommentations: recommendedFilmList.slice(offset, offset + limit),
  //           meta: {limit: limit, offset: offset}
  //         })

  //       });
  //     })
  //     .catch((err) => {
  //       res.status(422).json({message: ERROR_MESSAGE});
  //     });

  // Helper method get the average rating for each review. 
  function getAvgRatings(reviews) {
    let sumOfReviews = 0.0;
    let numOfReviews = reviews.length;
    
    reviews.forEach( review => {
      sumOfReviews += review.rating;
    });
    return (sumOfReviews / numOfReviews).toFixed(2);
  }

  // Helper function to handle error 
  function errorHandler(value) {
    if(isNaN(parseInt(value) || value < 0 || !value)) {
      return res.status(422).json({message: `Error: ${value} value is not valid!`});
    }
  }
}

module.exports = app;
