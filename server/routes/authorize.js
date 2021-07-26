const express = require('express');
const { exchangeCodeForAccessToken, fetchUserInfo } = require('../lib/authorize');
const { createSession } = require('../lib/db');

const router = express.Router();

/**
 * POST /authorize
 * Authenticates a user using the Trackmania API, returns an encrypted JWT token
 * Body:
 * - code
 * - redirect_uri
 */
router.post('/', async (req, res, next) => {
    try {
        // Get code and redirect URI from body
        const { code, redirect_uri: redirectUri } = req.body;

        // Check for missing parameters
        const missingParams = [];
        if (code === undefined || typeof code !== 'string') {
            missingParams.push('code');
        }
        if (redirectUri === undefined || typeof redirectUri !== 'string') {
            missingParams.push('redirect_uri');
        }
        if (missingParams.length > 0) {
            res.status(400).send({ message: `Body is missing the following params: ${missingParams}` });
            return; // TODO: check how to properly end response
        }

        // Exchange access code for access token from Trackmania API
        const accessToken = await exchangeCodeForAccessToken(code, redirectUri);
        if (accessToken === undefined || typeof accessToken !== 'string') {
            res.status(500).send({ message: 'Could not get access token from trackmania API.' });
            return; // TODO: check how to properly end response
        }

        // Fetch user info using access token
        const userInfo = await fetchUserInfo(accessToken);
        if (userInfo === undefined || userInfo.account_id === undefined || userInfo.display_name === undefined) {
            res.status(500).send({ message: 'Could not retrieve user info from trackmania API.' });
            return; // TODO: check how to properly end response
        }

        // Create session
        const sessionSecret = await createSession(userInfo.account_id);
        if (sessionSecret === undefined) {
            res.status(500).send({ message: 'Failed to create login session.' });
            return; // TODO: check how to properly end response
        }

        // Repond with user info
        res.send({
            accountId: userInfo.account_id,
            displayName: userInfo.display_name,
            sessionSecret,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
