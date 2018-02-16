const sqlite3 = require('sqlite3').verbose(),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

const BASE_API_URL = 'http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1';
const ERROR_MESSAGE = "Film id not valid or key missing";

// const db = new sqlite3.Database('./db/database.db', sqlite3.OPEN_READONLY, err => {
//   if (err) throw err; 
//   console.log("Successfully connected to Database");
// });

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
  let filmList = [];
  
  // Default limit value 
  let limit = 10;
  if(req.query.limit) {
    offset = parseInt(req.query.limit);
  }

  // Default offset value 
  let offset = 0;
  if(req.query.offset) {
    offset = parseInt(req.query.offset);
  }

  sequelize.query(`SELECT films.id, films.title, films.release_date AS releaseDate, genres.name AS genre FROM films 
    INNER JOIN genres ON films.genre_id = genres.id
    WHERE genre_id = (SELECT genre_id FROM films WHERE id = :id) 
    AND
      films.release_date >= date((SELECT films.release_date FROM films WHERE id = :id),'-15 years') 
    AND
      films.release_date <= date((SELECT films.release_date FROM films WHERE id = :id), '+15 years')`, {replacements: {id: id}, type: sequelize.QueryTypes.SELECT })
      .then( results => {
        
        // console.log(results);

        // Get ids of the filmList and transform the array into a string
        const filmIDList = results.map(film => {
          return film.id;
        }).join(',');
      
        // Build the URI for the API request
        let apiRequestInfo = {
          uri: BASE_API_URL + '?films=' + filmIDList,
          json: true
        };

        // Send request to 3rd party API
        request.get(apiRequestInfo, (err, response, body) => {

          // Get the list of reviews
          let reviews = response.body;

          // console.log(reviews);

          // Add reviews from 3rd party api to the results list
          // Get the reives
          for(let k = 0; k < results.length; k++) {
            if(results[k].id === reviews[k].film_id) {
              results[k].reviews = reviews[k].reviews.length;
              results[k].averageRating = getAvgRatings(reviews[k].reviews);
            }
          }

          // console.log(results);
          // filtering results by review length and average ratings
          let filteredResults = results.filter( (result) => {
            return result.reviews >= 5 && reviews.getAvgRating > 4.0;
          });

          console.log(filteredResults);

          let recommendedFilmList = [];
          filteredResults.forEach( film => {
            recommendedFilmList.push({
              id: film.id,
              title: film.title,
              releaseDate: film.releaseDate,
              genre: film.genre,
              averageRating: film.averageRating,
              reviews: film.reviews.length
            });
          });

          res.json({
            recommentations: recommendedFilmList,
            meta: {limit: limit, offset: offset}
          })

        });
      })
      .catch((err) => {
        res.status(422).json({message: ERROR_MESSAGE});
      });

  // This query returns the id, title, release date and genre of ALL the movies that has the same genre and it's within 15 years before and after the parent film's release date.
  // db.all(
  //   `SELECT films.id, films.title, films.release_date AS releaseDate, genres.name AS genre FROM films 
  //   INNER JOIN genres ON films.genre_id = genres.id
  //   WHERE genre_id = (SELECT genre_id FROM films WHERE id = :id) 
  //   AND
  //     films.release_date >= date((SELECT films.release_date FROM films WHERE id = :id),'-15 years') 
  //   AND
  //     films.release_date <= date((SELECT films.release_date FROM films WHERE id = :id), '+15 years')`,  => {
        
  //       if(rows === undefined) {
  //         return res.json({message: 'No film with id: ' + id + '.'});
  //       }

  //       // console.log(rows);
  //       // fetchReviewsFromAPI(rows);
  //       filmList = rows;

  //       // Get ids of the filmList and transform the array into a string
  //       const filmIDList = filmList.map(film => {
  //         return film.id;
  //       }).join(',');
      
  //       // Build the URI for the API request
  //       let apiRequestInfo = {
  //         uri: BASE_API_URL + '?films=' + filmIDList,
  //         json: true
  //       };

  //       request.get(apiRequestInfo, (err, res, body)=> {
  //         let reviewList = body[0];
    
  //         console.log(reviewList);
  //         // this loop iterates throught the filmList and search
  //         // for films which has a minimum of 5 reviews and a 
  //         // average ratings greater than 4.0.
  //         for(let k = 0; k < filmList.length; k++) {
  //           if(filmList[k].id === reviewList.film_id) {
  //               filmList[k].reviews = reviewList.reviews;
  //           }
  //         }
          
  //         for(let k = 0; k < filmList.length; k++) {
  //           let total = 0.0;
  //           let numOfReviews = reviewList.reviews.length;

  //           filmList[k].reviews.map(review => {
  //             total += review.rating;
  //           })

  //           filmList[k].averageRating = total/numOfReviews;
  //         }

  //         console.log(filmList[0].reviews[0]);
          
  //         let filterfilmsByReviews = filmList.filter((result) => {
  //           return filmList.reviews.length >= 5;
  //         });
      
  //         let filterfilmsByAvgRatings = filterfilmsByReviews.filter((result) => {
  //           return result.averageRating > 4
  //         });
          
    
  //         let recommendedFilms = []
  //         filterfilmsByAvgRatings.forEach( (result) => {
  //           recommendedFilms.push({
  //             id: result.id,
  //             title: result.title,
  //             releaseDate: result.releaseDate,
  //             genre: result.genre,
  //             averageRating: getAvgRating,
  //             reviews: result.reviews.length
  //           });
  //         });
    
  //         // Handles offset, limit and response in json format
  //         res.json({
  //           recomendations: recommendedFilms.slice(offset, offset+limit),
  //           meta: {limit: limit, offset: offset}
  //         });
  //       });
         
  //  });

  // Helper method get the average rating for each review. 
  function getAvgRatings(reviews) {
    let sumOfReviews = 0.0;
    let numOfReviews = reviews.length;
    
    reviews.forEach( review => {
      sumOfReviews += review.rating;
    });
    return (sumOfReviews / numOfReviews).toFixed(2);
  }


//   // This helper function will retrieve the ratings and Review from the third party API
// function fetchReviewsFromAPI(filmList) {
  
//     // Get ids of the filmList and transform the array into a string
//     const filmIDList = filmList.map(film => {
//       return film.id;
//     }).join(',');
  
//     // Build the URI for the API request
//     let apiRequestInfo = {
//       uri: BASE_API_URL + '?films=' + filmIDList,
//     };
    
//     request.get(apiRequestInfo, (err, res, body)=> {
//       let reviewList = body[0];

//       console.log(reviewList);
//       // this loop iterates throught the filmList and search
//       // for films which has a minimum of 5 reviews and a 
//       // average ratings greater than 4.0.
//       for(let k = 0; k < filmList.length; k++) {
//         if(filmList[k].id === reviewList.film_id) {
//             filmList[k].reviews = reviewList.reviews;
//             filmList[k].averageRating = getAvgRatings(reviewList.reviews);
//         }
//       }

//       console.log(filmList[0]);
      
//       let filterfilmsByReviews = filmList.filter((result) => {
//         return filmList.length >= 5;
//       });
  
//       let filterfilmsByAvgRatings = filterfilmsByReviews.filter((result) => {
//         return getAvgRatings(result) > 4
//       });
      

//       let recommendedFilms = []
//       filterfilmsByAvgRatings.forEach( (result) => {
//         recommendedFilms.push({
//           id: result.id,
//           title: result.title,
//           releaseDate: result.releaseDate,
//           genre: result.genre,
//           averageRating: getAvgRating,
//           reviews: result.reviews.length
//         });
//       });

//       // Handles offset, limit and response in json format
//       res.json({
//         recomendations: recommendedFilms.slice(offset, offset+limit),
//         meta: {limit: limit, offset: offset}
//       });
//     });
//   }
  
//   // Helper method get the average rating for each review. 
//   function getAvgRatings(reviewList) {
//     let sumOfReviews = 0.0;
//     let numOfReviews = reviewList.length;
    
//     reviewList.reviews.forEach(review => {
//       sumOfReviews += review.rating;
//     });
//     return sumOfReviews / numOfReviews;
//   }
}

app.use(function(req, res, next) {
  res.status(404).json({message: "Page not found"});
})
module.exports = app;
