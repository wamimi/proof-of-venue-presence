// Set timezone to East African Time (GMT+3)
process.env.TZ = 'Africa/Nairobi';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    res.json({
        status: 'healthy',
        environment: 'serverless',
        noir_version: 'N/A (serverless deployment)',
        timestamp: new Date().toISOString()
    });
} 