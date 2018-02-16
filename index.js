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
    * IMPLEMENT: Paginate by offeset
    * IMPLEMENT: Limit the number of returned records
    */

    /**
     * TODO: 3. The application should handler for:
     * IMPLEMENT: Client/server failure
     * IMPLEMENT: Missing routes
     */

  // res.status(500).send('Not Implemented');
  
  let id = req.params.id; 
  let data = [];

  // This query returns the id, title, release date and genre of ALL the movies that has the same genre and it's within 15 years before and after the parent film's release date.
  db.all(
    `SELECT films.id, films.title, films.release_date AS releaseDate, genres.name AS genre FROM films 
    INNER JOIN genres ON films.genre_id = genres.id
    WHERE genre_id = (SELECT genre_id FROM films WHERE id = $id) 
    AND
      films.release_date >= date((SELECT films.release_date FROM films WHERE id = $id),'-15 years') 
    AND
      films.release_date <= date((SELECT films.release_date FROM films WHERE id = $id), '+15 years')`,{$id: id}, (err, row) => {
        if(err) console.error(err.message);
        
        if(row === undefined) {
          return res.json({message: 'No film with id: ' + id +'.'});
        } 

        res.status(200).send(row);
        console.log(row);
        
  });

}

// This helper function will retrieve the ratings and Review from the third party API
function fetchReviewsFromAPI(data) {
  
}
module.exports = app;
