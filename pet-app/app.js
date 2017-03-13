'use strict';
// npm install express express-hbs
function create(hbs, env) {
    if (env) process.env.NODE_ENV = env;
    var express = require('express');
    var app = express();
    var fs = require('fs');
    var fp = require('path');
    var rp = require('request-promise');
    var bodyParser = require('body-parser');

    function relative(path) {
        return fp.join(__dirname, path);
    }
    var viewsDir = relative('views');

    app.use(express.static(relative('public')));
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());
    // Hook in express-hbs and tell it where known directories reside
    app.engine('hbs', hbs.express4({
        partialsDir: [relative('views/partials'), relative('views/partials-other')],
        defaultLayout: relative('views/layout/default.hbs')
    }));
    app.set('view engine', 'hbs');
    app.set('views', viewsDir);
    // Register sync helper
    hbs.registerHelper('link', function(text, options) {
        var attrs = [];
        for (var prop in options.hash) {
            attrs.push(prop + '="' + options.hash[prop] + '"');
        }
        return new hbs.SafeString(
            '<a ' + attrs.join(' ') + '>' + text + '</a>'
        );
    });
    // Register Async helpers
    hbs.registerAsyncHelper('readFile', function(filename, cb) {
        fs.readFile(fp.join(viewsDir, filename), 'utf8', function(err, content) {
            if (err) console.error(err);
            cb(new hbs.SafeString(content));
        });
    });
    hbs.registerHelper('json', function(obj) {
        return JSON.stringify(obj);
    });

    app.get('/', function(req, res) {
        rp('https://petshelterapi.herokuapp.com/api/pets')
            .then(function(response) {
                res.render('pets', {
                    pets: response
                });
            })
            .catch(function(err) {
                // Crawling failed...
            });
    });

    app.get('/pets/add', function(req, res) {
        res.render('pets_add');
    });

    app.get('/pets/:id', function(req, res) {
        var petLookupApi = {
            uri: 'https://petshelterapi.herokuapp.com/api/pets/' + req.params.id,
            json: true
        };
        rp(petLookupApi)
            .then(function(response) {
                forcastLookup(res, response);
            })
            .catch(function(err) {
                res.render('pet_weather_details', {
                    isError: 'ERROR'
                });
            });
    });

    app.post('/pet/add', function(req, res) {
        var request = require('request');
        var options = {
            method: 'POST',
            uri: 'https://petshelterapi.herokuapp.com/api/pets',
            body: {
                name: req.body.pet.name,
                type: req.body.pet.type,
                breed: req.body.pet.breed,
                location: req.body.pet.location,
                latitude: req.body.pet.latitude,
                longitude: req.body.pet.longitude
            },
            json: true
        };

        rp(options)
            .then(function(parsedBody) {
                res.redirect('/');
            })
            .catch(function(err) {
                // POST failed...
            });

    });

    function forcastLookup(res, pet) {
        var forcastApiLookup = {
            method: 'GET',
            uri: 'https://api.darksky.net/forecast/b9c5e126401e0e93280d33bb56716fd0/' + pet.latitude + ',' + pet.longitude,
            json: true
        };

        rp(forcastApiLookup)
            .then(function(response) {
                res.render('pet_weather_details', {
                    isRain: _isRain(response.currently.precipIntensity),
                    name: pet.name,
                    location: pet.location,
                });
            })
            .catch(function(err) {
                res.render('pet_weather_details', {
                    isError: 'true'
                });
            });
    }

    function _isRain(intensity) {
        if (intensity > 0) {
            return 'true';
        } else {
            return 'false';
        }
    }
    return app;

}
if (require.main === module) {
    var hbs = require('..');
    var app = create(hbs);
    app.listen(3000);
    console.log('Express server listening on port 3000');
} else {
    exports.create = create;
}