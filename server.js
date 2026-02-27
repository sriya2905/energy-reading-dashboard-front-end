import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory token storage (for demonstration; in production, consider a more secure way)
let ionToken = null;

/**
 * Helper to get the base URL for ION Sense
 */
const getIonBaseUrl = () => {
    const url = process.env.ION_SENSE_URL;
    if (!url) {
        throw new Error('ION_SENSE_URL environment variable is not defined');
    }
    return url.endsWith('/') ? url.slice(0, -1) : url;
};

/**
 * POST /login
 * Authenticate with ION Sense using username and password from .env
 */
app.post('/login', async (req, res) => {
    try {
        const url = `${getIonBaseUrl()}/auth/login`; // Assuming standard auth path
        const response = await axios.post(url, {
            username: process.env.ION_USERNAME,
            password: process.env.ION_PASSWORD
        });

        // Assuming ION Sense returns a token in the response
        ionToken = response.data.token || response.data.accessToken;

        if (!ionToken) {
            return res.status(401).json({ error: 'Authentication failed: No token returned' });
        }

        res.json({ message: 'Authenticated successfully with ION Sense' });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to authenticate with ION Sense',
            details: error.response?.data || error.message
        });
    }
});

/**
 * GET /device/:deviceName
 * Fetch Active Forward Energy and Total Active Power
 */
app.get('/device/:deviceName', async (req, res) => {
    const { deviceName } = req.params;

    if (!ionToken) {
        return res.status(401).json({ error: 'Not authenticated with ION Sense. Please call /login first.' });
    }

    try {
        // Assuming there's an endpoint to get device data by name
        // The exact path might vary depending on ION Sense API
        const url = `${getIonBaseUrl()}/devices/${deviceName}/data`;
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${ionToken}`
            }
        });

        // The requirement specifies only:
        // - Active Forward Energy
        // - Total Active Power
        // We handle mapping the raw ION Sense data to the requested format.
        // Assuming ION Sense data structure:
        const rawData = response.data;

        // Let's assume common key names if not specified, or just map what's expected.
        // If the exact keys are known, replace them here.
        const activeForwardEnergy = rawData.activeForwardEnergy || rawData.energy_forward || "0";
        const totalActivePower = rawData.totalActivePower || rawData.power_total || "0";

        res.json({
            deviceName: deviceName,
            activeForwardEnergy: activeForwardEnergy.toString(),
            totalActivePower: totalActivePower.toString()
        });
    } catch (error) {
        console.error(`Error fetching data for ${deviceName}:`, error.message);
        res.status(error.response?.status || 500).json({
            error: `Failed to fetch data for device: ${deviceName}`,
            details: error.response?.data || error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
