#!/usr/bin/env node
var git         = require('simple-git')();
var Preferences = require('preferences');
var files       = require('./lib/files');
var inquirer    = require('inquirer');
var figlet      = require('figlet');
var GitHubApi   = require('github');
var _           = require('lodash');
var chalk       = require('chalk');
var clear       = require('clear');
var touch       = require('touch');
var CLI         = require('clui');
var fs          = require('fs');
var Spinner     = CLI.Spinner;

var github = new GitHubApi({
    version: '3.0.0'
});

clear();
console.log(
    chalk.yellow(
        figlet.textSync('GitUp', {
            horizontalLayout: 'full'
        })
    )
);

if (files.directoryExists('.git')) {
    console.log(chalk.red('Already a git repository!'));
    process.exit();
}

function getGithubCredentials(callback) {
    var questions = [{
        name: 'username',
            type: 'input',
            message: 'Enter your Github username or e-mail address:',
            validate: function(value) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter your username or e-mail address';
                }
            }
        },
        {
            name: 'password',
            type: 'password',
            message: 'Enter your password:',
            validate: function(value) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter your password';
                }
            }
        }
    ];

    inquirer.prompt(questions).then(callback);
}

function getGithub2FACode(callback) {
    var questions = [{
        name: 'code',
            type: 'input',
            message: 'Enter your Github 2FA code:',
            validate: function(value) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter your Github 2FA code.';
                }
            }
        }
    ];

    inquirer.prompt(questions).then(callback);
}

function getGithubToken(callback) {
    var prefs = new Preferences('ginit');

    if (prefs.github && prefs.github.token) {
        return callback(null, prefs.github.token);
    }

    // Fetch token
    getGithubCredentials(function(credentials) {
        var status = new Spinner('Authenticating, please wait...');
        status.start();

        github.authenticate(_.extend({ type: 'basic' }, credentials));

        github.authorization.create({
            scopes: ['user', 'public_repo', 'repo', 'repo:status'],
            note: 'GitUp, a command-line tool for initalizing Git repos'
        }, function(err, res) {
            status.stop();
            if (err.message.includes("Must specify two-factor authentication OTP code.")) {

                getGithub2FACode(function(twoFactor) {
                    github.authorization.create({
                        scopes: ['user', 'public_repo', 'repo', 'repo:status'],
                        note: 'GitUp, a command-line tool for initalizing Git repos',
                        headers: {
                            "X-GitHub-OTP": twoFactor.code
                        }
                    }, function(err, res) {
                        if (err) {
                            return callback(err);
                        }
                        if (res.token) {
                            prefs.github = {
                                token: res.token
                            };
                            return callback(null, res.token);
                        }
                        return callback();
                    });
                });
            } else if (err) {
                return callback(err);
            } else if (res.token) {
                prefs.github = {
                    token: res.token
                };
                return callback(null, res.token);
            }
            // return callback();
        });
    });
}

function createRepo(callback) {
    var argv = require('minimist')(process.argv.slice(2));

    var questions = [
        {
            type: 'input',
            name: 'name',
            message: 'Enter a name for the repository:',
            default: argv._[0] || files.getCurrentDirectoryBase(),
            validate: function( value ) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter a name for the repository';
                }
            }
        },
        {
            type: 'input',
            name: 'description',
            default: argv._[1] || null,
            message: '[optional] Enter a description of the repository:'
        },
        {
            type: 'list',
            name: 'visibility',
            message: 'Public or private:',
            choices: [ 'public', 'private' ],
            default: 'public'
        }
    ];

    inquirer.prompt(questions).then(function(answers) {
        var status = new Spinner('Creating repository...');
        status.start();

        var data = {
            name : answers.name,
            description : answers.description,
            private : (answers.visibility === 'private')
        };

        github.repos.create(
            data,
            function(err, res) {
                status.stop();
                if (err) {
                    return callback(err);
                }
                return callback(null, res.ssh_url);
            }
        );
    });
}

function createGitignore(callback) {
    var filelist = _.without(fs.readdirSync('.'), '.git', '.gitignore');

    if (filelist.length) {
        inquirer.prompt(
            [
                {
                    type: 'checkbox',
                    name: 'ignore',
                    message: 'Select the files and/or folders you wish to ignore:',
                    choices: filelist,
                    default: ['node_modules', '*.log', '.DS_Store']
                }
            ]
        ).then(function(answers) {
            if (answers.ignore.length) {
                fs.writeFileSync( '.gitignore', answers.ignore.join( '\n' ) );
            } else {
                touch('.gitignore');
            }
            return callback();
        });
    } else {
        touch('.gitignore');
        return callback();
    }
}

function setupRepo( url, callback ) {
    var status = new Spinner('Setting up the repository...');
    status.start();

    git
        .init()
        .add('.gitignore')
        .add('./*')
        .commit('Initial commit')
        .addRemote('origin', url)
        .push('origin', 'master')
        .then(function(){
            status.stop();
            return callback();
        });
}

function githubAuth(callback) {
    getGithubToken(function(err, token) {
        if (err) {
            return callback(err);
        }
        github.authenticate({
            type : 'oauth',
            token : token
        });
        return callback(null, token);
    });
}

githubAuth(function(err, authed) {
    if (err) {
        switch (err.code) {
            case 401:
                console.log(chalk.red('Couldn\'t log you in. Please try again.'));
                break;
            case 422:
                console.log(chalk.red('You already have an access token.'));
                break;
        }
    }
    if (authed) {
        console.log(chalk.green('Sucessfully authenticated!'));
        createRepo(function(err, url){
            if (err) {
                console.log('An error has occured');
            }
            if (url) {
                createGitignore(function() {
                    setupRepo(url, function(err) {
                        if (!err) {
                            console.log(chalk.green('All done!'));
                        }
                    });
                });
            }
        });
    }
});
