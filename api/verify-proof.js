// Set timezone to East African Time (GMT+3)
process.env.TZ = 'Africa/Nairobi';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    console.log('📡 Received proof verification request');
    
    try {
        const { proofHash } = req.body;
        
        if (!proofHash) {
            return res.status(400).json({
                success: false,
                error: 'Proof hash is required'
            });
        }

        // For serverless deployment, we'll simulate verification
        // In a real production system, you'd want to store and verify actual proofs
        const isValidFormat = proofHash.startsWith('0x') && proofHash.length >= 20;
        
        res.json({
            success: true,
            verified: isValidFormat,
            verificationOutput: isValidFormat ? 
                'Proof verified successfully (simulated for serverless deployment)' : 
                'Invalid proof format',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error verifying proof:', error);
        res.json({
            success: false,
            verified: false,
            error: error.message
        });
    }
} 