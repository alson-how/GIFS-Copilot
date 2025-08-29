/**
 * Strategic Items RAG Service
 * Malaysian Strategic Trade Act 2010 Compliance System
 * 
 * This service provides:
 * - Vector embeddings for strategic items
 * - Semantic search capabilities
 * - Strategic items database management
 * - Multi-layer detection coordination
 */

import OpenAI from 'openai';
import pg from 'pg';

class StrategicItemsRAG {
    constructor(db) {
        this.db = db;
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Detection layer configurations
        this.detectionLayers = {
            RAG_EXACT_MATCH: { order: 1, confidence: 95 },
            RAG_SEMANTIC_SEARCH: { order: 2, confidence: 85 },
            TECHNICAL_SPECS: { order: 3, confidence: 90 },
            HS_CODE_RAG: { order: 4, confidence: 70 },
            KEYWORDS_RAG: { order: 5, confidence: 60 }
        };
    }

    /**
     * Initialize the RAG system with strategic items data
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Strategic Items RAG System...');
            
            // Check if strategic items are already loaded
            const { rows } = await this.db.query('SELECT COUNT(*) as count FROM strategic_items_rag');
            
            if (parseInt(rows[0].count) === 0) {
                console.log('📥 Loading Malaysian Strategic Items List...');
                await this.loadStrategicItemsList();
            } else {
                console.log(`✅ Strategic Items RAG already initialized with ${rows[0].count} items`);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Strategic Items RAG:', error);
            throw error;
        }
    }

    /**
     * Load and process Malaysian Strategic Items List
     */
    async loadStrategicItemsList() {
        const strategicItems = [
            // Electronics & Semiconductors
            {
                strategic_code: '3A001.a.1',
                description: 'Electronic computers and related equipment having any of the following characteristics, and specially designed components therefor',
                category: 'Electronics',
                subcategory: 'Computers',
                technical_specs: {
                    performance_threshold: 'Weighted TeraFLOPS (WT) > 4800',
                    ai_accelerator: true,
                    process_node: '≤16nm'
                },
                keywords: ['computer', 'processor', 'AI accelerator', 'neural processing', 'machine learning'],
                required_permits: ['STA_2010', 'AICA', 'TechDocs'],
                permit_details: {
                    'STA_2010': { deadline_days: 30, authority: 'MITI', mandatory: true },
                    'AICA': { deadline_days: 14, authority: 'MCMC', mandatory: true },
                    'TechDocs': { deadline_days: 7, authority: 'Internal', mandatory: true }
                },
                control_list_source: 'Malaysia_Strategic_2025'
            },
            {
                strategic_code: '4A003.u',
                description: 'Digital computers, electronic assemblies and components therefor, other than those specified in 4A001',
                category: 'Electronics',
                subcategory: 'Digital Systems',
                technical_specs: {
                    processing_capability: 'High-performance computing',
                    dual_use_potential: true
                },
                keywords: ['digital computer', 'electronic assembly', 'processing unit', 'computing system'],
                required_permits: ['STA_2010', 'AICA', 'TechDocs'],
                permit_details: {
                    'STA_2010': { deadline_days: 30, authority: 'MITI', mandatory: true },
                    'AICA': { deadline_days: 14, authority: 'MCMC', mandatory: true },
                    'TechDocs': { deadline_days: 7, authority: 'Internal', mandatory: true }
                },
                control_list_source: 'Malaysia_Strategic_2025'
            },
            // Network Equipment
            {
                strategic_code: '5A002.a',
                description: 'Systems, equipment and components for information security',
                category: 'Telecommunications',
                subcategory: 'Security Equipment',
                technical_specs: {
                    encryption_capability: true,
                    security_level: 'High'
                },
                keywords: ['network switch', 'router', 'telecommunications', 'high-speed', 'switching'],
                required_permits: ['STA_2010', 'SIRIM'],
                permit_details: {
                    'STA_2010': { deadline_days: 30, authority: 'MITI', mandatory: true },
                    'SIRIM': { deadline_days: 21, authority: 'SIRIM', mandatory: true }
                },
                control_list_source: 'Malaysia_Strategic_2025'
            },
            // Memory & Storage
            {
                strategic_code: '3A001.a.3',
                description: 'Electronic assemblies, modules and equipment, and specially designed components therefor',
                category: 'Electronics',
                subcategory: 'Memory Systems',
                technical_specs: {
                    memory_capacity: '≥64GB',
                    memory_type: 'High-performance',
                    server_grade: true
                },
                keywords: ['memory module', 'RAM', 'server memory', 'high-capacity', 'DDR'],
                required_permits: ['STA_2010'],
                permit_details: {
                    'STA_2010': { deadline_days: 30, authority: 'MITI', mandatory: true }
                },
                control_list_source: 'Malaysia_Strategic_2025'
            },
            // Fiber Optics
            {
                strategic_code: '6A002.a',
                description: 'Optical fibres, optical fibre cables and optical fibre assemblies',
                category: 'Telecommunications',
                subcategory: 'Optical Systems',
                technical_specs: {
                    transmission_capability: 'High-speed data transmission',
                    fiber_type: 'Single-mode or Multi-mode'
                },
                keywords: ['fiber optic', 'optical cable', 'high-speed transmission', 'data communication'],
                required_permits: ['STA_2010'],
                permit_details: {
                    'STA_2010': { deadline_days: 30, authority: 'MITI', mandatory: true }
                },
                control_list_source: 'Malaysia_Strategic_2025'
            },
            // Software & Encryption
            {
                strategic_code: '5D002',
                description: 'Software for information security systems, equipment and components',
                category: 'Software',
                subcategory: 'Security Software',
                technical_specs: {
                    encryption_strength: '≥128-bit',
                    cryptographic_capability: true
                },
                keywords: ['encryption software', 'cryptographic', 'security software', 'information security'],
                required_permits: ['STA_2010', 'AICA', 'CyberSecurity'],
                permit_details: {
                    'STA_2010': { deadline_days: 30, authority: 'MITI', mandatory: true },
                    'AICA': { deadline_days: 14, authority: 'MCMC', mandatory: true },
                    'CyberSecurity': { deadline_days: 21, authority: 'CyberSecurity', mandatory: true }
                },
                control_list_source: 'Malaysia_Strategic_2025'
            }
        ];

        for (const item of strategicItems) {
            try {
                // Generate embedding for the item description and keywords
                const textForEmbedding = `${item.description} ${item.keywords.join(' ')} ${item.category} ${item.subcategory}`;
                const embedding = await this.generateEmbedding(textForEmbedding);
                
                // Insert into database
                await this.db.query(`
                    INSERT INTO strategic_items_rag (
                        strategic_code, description, category, subcategory,
                        technical_specs, keywords, embedding, required_permits,
                        permit_details, control_list_source, effective_date
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (strategic_code) DO UPDATE SET
                        description = EXCLUDED.description,
                        technical_specs = EXCLUDED.technical_specs,
                        keywords = EXCLUDED.keywords,
                        embedding = EXCLUDED.embedding,
                        required_permits = EXCLUDED.required_permits,
                        permit_details = EXCLUDED.permit_details,
                        updated_at = NOW()
                `, [
                    item.strategic_code,
                    item.description,
                    item.category,
                    item.subcategory,
                    JSON.stringify(item.technical_specs),
                    item.keywords,
                    `[${embedding.join(',')}]`, // Vector format for PostgreSQL
                    item.required_permits,
                    JSON.stringify(item.permit_details),
                    item.control_list_source,
                    new Date()
                ]);
                
                console.log(`✅ Loaded strategic item: ${item.strategic_code}`);
            } catch (error) {
                console.error(`❌ Failed to load strategic item ${item.strategic_code}:`, error);
            }
        }
        
        console.log('✅ Strategic Items List loaded successfully');
    }

    /**
     * Generate OpenAI embedding for text
     */
    async generateEmbedding(text) {
        try {
            const response = await this.openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: text
            });
            return response.data[0].embedding;
        } catch (error) {
            console.error('❌ Failed to generate embedding:', error);
            throw error;
        }
    }

    /**
     * Layer 1: RAG Exact Match Detection (95% confidence)
     */
    async detectExactMatch(productDescription, hsCode) {
        try {
            const query = `
                SELECT strategic_code, description, required_permits, permit_details, category
                FROM strategic_items_rag
                WHERE 
                    LOWER(description) LIKE LOWER($1) OR
                    $2 = ANY(keywords) OR
                    (technical_specs->>'hs_code_pattern') = $3
            `;
            
            const { rows } = await this.db.query(query, [
                `%${productDescription}%`,
                productDescription.toLowerCase(),
                hsCode
            ]);
            
            if (rows.length > 0) {
                return {
                    layer: 'RAG_EXACT_MATCH',
                    confidence: 95,
                    matches: rows,
                    detection_method: 'Direct database lookup'
                };
            }
            
            return null;
        } catch (error) {
            console.error('❌ Layer 1 detection failed:', error);
            return null;
        }
    }

    /**
     * Layer 2: RAG Semantic Search (85% confidence)
     */
    async detectSemanticMatch(productDescription) {
        try {
            // Generate embedding for the product description
            const embedding = await this.generateEmbedding(productDescription);
            
            // Perform vector similarity search
            const query = `
                SELECT 
                    strategic_code, 
                    description, 
                    required_permits, 
                    permit_details, 
                    category,
                    1 - (embedding <=> $1::vector) as similarity
                FROM strategic_items_rag
                WHERE 1 - (embedding <=> $1::vector) > 0.85
                ORDER BY similarity DESC
                LIMIT 10
            `;
            
            const { rows } = await this.db.query(query, [`[${embedding.join(',')}]`]);
            
            if (rows.length > 0) {
                return {
                    layer: 'RAG_SEMANTIC_SEARCH',
                    confidence: Math.round(rows[0].similarity * 100),
                    matches: rows,
                    detection_method: 'Vector similarity search'
                };
            }
            
            return null;
        } catch (error) {
            console.error('❌ Layer 2 detection failed:', error);
            return null;
        }
    }

    /**
     * Layer 3: Technical Specifications Analysis (90% confidence)
     */
    async detectTechnicalSpecs(productDescription, hsCode, technicalData = {}) {
        try {
            const detectionRules = [
                // AI Chips / High-performance processors
                {
                    condition: (desc, hs, tech) => {
                        const aiKeywords = ['AI', 'neural', 'accelerator', 'TPU', 'GPU', 'machine learning'];
                        const hasAIKeyword = aiKeywords.some(keyword => 
                            desc.toLowerCase().includes(keyword.toLowerCase())
                        );
                        const highPerformance = tech.tpp && tech.tpp > 4800;
                        const advancedNode = tech.processNode && parseInt(tech.processNode) <= 16;
                        
                        return hasAIKeyword || highPerformance || advancedNode;
                    },
                    strategic_code: '3A001.a.1',
                    confidence: 90,
                    reason: 'High-performance AI/ML processing capability detected'
                },
                // High-speed networking equipment
                {
                    condition: (desc, hs, tech) => {
                        const networkKeywords = ['switch', 'router', 'network', 'high-speed'];
                        const isNetworkEquipment = networkKeywords.some(keyword => 
                            desc.toLowerCase().includes(keyword.toLowerCase())
                        );
                        const telecomHS = ['8517', '8471', '8473'].some(code => hs.startsWith(code));
                        
                        return isNetworkEquipment && telecomHS;
                    },
                    strategic_code: '5A002.a',
                    confidence: 85,
                    reason: 'High-speed network equipment detected'
                },
                // High-capacity memory systems
                {
                    condition: (desc, hs, tech) => {
                        const memoryKeywords = ['memory', 'RAM', 'server memory'];
                        const hasMemoryKeyword = memoryKeywords.some(keyword => 
                            desc.toLowerCase().includes(keyword.toLowerCase())
                        );
                        const highCapacity = desc.match(/(\d+)\s*GB/) && 
                            parseInt(desc.match(/(\d+)\s*GB/)[1]) >= 64;
                        
                        return hasMemoryKeyword && highCapacity;
                    },
                    strategic_code: '3A001.a.3',
                    confidence: 80,
                    reason: 'High-capacity memory system detected'
                }
            ];
            
            const matches = [];
            for (const rule of detectionRules) {
                if (rule.condition(productDescription, hsCode, technicalData)) {
                    // Get full strategic item details
                    const { rows } = await this.db.query(
                        'SELECT * FROM strategic_items_rag WHERE strategic_code = $1',
                        [rule.strategic_code]
                    );
                    
                    if (rows.length > 0) {
                        matches.push({
                            ...rows[0],
                            confidence: rule.confidence,
                            detection_reason: rule.reason
                        });
                    }
                }
            }
            
            if (matches.length > 0) {
                return {
                    layer: 'TECHNICAL_SPECS',
                    confidence: Math.max(...matches.map(m => m.confidence)),
                    matches: matches,
                    detection_method: 'Technical specifications analysis'
                };
            }
            
            return null;
        } catch (error) {
            console.error('❌ Layer 3 detection failed:', error);
            return null;
        }
    }

    /**
     * Layer 4: HS Code + RAG Analysis (70% confidence)
     */
    async detectHSCodeRAG(hsCode, productDescription) {
        try {
            // Strategic HS code patterns
            const strategicHSCodes = {
                '8542': 'Electronic integrated circuits and microassemblies',
                '8471': 'Automatic data processing machines and units',
                '8473': 'Parts and accessories of machines of headings 84.69 to 84.72',
                '8517': 'Telephone sets and other apparatus for transmission',
                '9013': 'Liquid crystal devices and optical instruments',
                '8544': 'Insulated wire, cable and other insulated electric conductors'
            };
            
            // Check if HS code matches strategic patterns
            const matchingHSCode = Object.keys(strategicHSCodes).find(code => 
                hsCode.startsWith(code)
            );
            
            if (matchingHSCode) {
                // Perform semantic search within this HS code category
                const embedding = await this.generateEmbedding(productDescription);
                
                const query = `
                    SELECT 
                        strategic_code, 
                        description, 
                        required_permits, 
                        permit_details, 
                        category,
                        1 - (embedding <=> $1::vector) as similarity
                    FROM strategic_items_rag
                    WHERE 
                        (technical_specs->>'hs_code_pattern' LIKE $2 OR category = 'Electronics')
                        AND 1 - (embedding <=> $1::vector) > 0.65
                    ORDER BY similarity DESC
                    LIMIT 5
                `;
                
                const { rows } = await this.db.query(query, [
                    `[${embedding.join(',')}]`,
                    `${matchingHSCode}%`
                ]);
                
                if (rows.length > 0) {
                    return {
                        layer: 'HS_CODE_RAG',
                        confidence: 70,
                        matches: rows,
                        detection_method: `HS Code ${matchingHSCode} analysis with RAG validation`,
                        hs_code_category: strategicHSCodes[matchingHSCode]
                    };
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Layer 4 detection failed:', error);
            return null;
        }
    }

    /**
     * Layer 5: Keywords + RAG Validation (60% confidence)
     */
    async detectKeywordsRAG(productDescription) {
        try {
            const strategicKeywords = [
                'encryption', 'cryptographic', 'dual-use', 'military',
                'artificial intelligence', 'machine learning', 'neural network',
                'high-performance computing', 'supercomputer', 'quantum',
                'surveillance', 'intrusion detection', 'cybersecurity',
                'semiconductor', 'microprocessor', 'integrated circuit'
            ];
            
            // Check for strategic keywords in description
            const foundKeywords = strategicKeywords.filter(keyword =>
                productDescription.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (foundKeywords.length > 0) {
                // Validate with RAG search
                const embedding = await this.generateEmbedding(productDescription);
                
                const query = `
                    SELECT 
                        strategic_code, 
                        description, 
                        required_permits, 
                        permit_details, 
                        category,
                        keywords,
                        1 - (embedding <=> $1::vector) as similarity
                    FROM strategic_items_rag
                    WHERE 
                        keywords && $2::text[]
                        AND 1 - (embedding <=> $1::vector) > 0.60
                    ORDER BY similarity DESC
                    LIMIT 5
                `;
                
                const { rows } = await this.db.query(query, [
                    `[${embedding.join(',')}]`,
                    foundKeywords
                ]);
                
                if (rows.length > 0) {
                    return {
                        layer: 'KEYWORDS_RAG',
                        confidence: 60,
                        matches: rows,
                        detection_method: 'Strategic keywords with RAG validation',
                        found_keywords: foundKeywords
                    };
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Layer 5 detection failed:', error);
            return null;
        }
    }

    /**
     * Multi-layer Strategic Items Detection
     */
    async detectStrategicItems(productItem) {
        try {
            const {
                description,
                hs_code: hsCode,
                technical_specs: technicalData = {}
            } = productItem;
            
            console.log(`🔍 Running multi-layer detection for: ${description}`);
            
            const detectionResults = {
                product_description: description,
                hs_code: hsCode,
                detection_layers: {},
                final_confidence: 0,
                is_strategic: false,
                strategic_codes: [],
                required_permits: [],
                detection_summary: []
            };
            
            // Run all detection layers
            const layers = [
                { name: 'exact_match', method: this.detectExactMatch.bind(this) },
                { name: 'semantic_search', method: this.detectSemanticMatch.bind(this) },
                { name: 'technical_specs', method: this.detectTechnicalSpecs.bind(this) },
                { name: 'hs_code_rag', method: this.detectHSCodeRAG.bind(this) },
                { name: 'keywords_rag', method: this.detectKeywordsRAG.bind(this) }
            ];
            
            for (const layer of layers) {
                try {
                    let result = null;
                    
                    switch (layer.name) {
                        case 'exact_match':
                            result = await layer.method(description, hsCode);
                            break;
                        case 'semantic_search':
                            result = await layer.method(description);
                            break;
                        case 'technical_specs':
                            result = await layer.method(description, hsCode, technicalData);
                            break;
                        case 'hs_code_rag':
                            result = await layer.method(hsCode, description);
                            break;
                        case 'keywords_rag':
                            result = await layer.method(description);
                            break;
                    }
                    
                    detectionResults.detection_layers[layer.name] = result;
                    
                    if (result && result.matches && result.matches.length > 0) {
                        console.log(`✅ Layer ${layer.name}: ${result.confidence}% confidence, ${result.matches.length} matches`);
                        
                        // Update final confidence with highest layer confidence
                        if (result.confidence > detectionResults.final_confidence) {
                            detectionResults.final_confidence = result.confidence;
                        }
                        
                        // Collect strategic codes and permits
                        result.matches.forEach(match => {
                            if (!detectionResults.strategic_codes.includes(match.strategic_code)) {
                                detectionResults.strategic_codes.push(match.strategic_code);
                            }
                            
                            if (match.required_permits) {
                                match.required_permits.forEach(permit => {
                                    if (!detectionResults.required_permits.includes(permit)) {
                                        detectionResults.required_permits.push(permit);
                                    }
                                });
                            }
                        });
                        
                        detectionResults.detection_summary.push({
                            layer: layer.name,
                            confidence: result.confidence,
                            matches_count: result.matches.length,
                            method: result.detection_method
                        });
                    }
                } catch (layerError) {
                    console.error(`❌ Layer ${layer.name} failed:`, layerError);
                    detectionResults.detection_layers[layer.name] = { error: layerError.message };
                }
            }
            
            // Determine if item is strategic (confidence >= 60%)
            detectionResults.is_strategic = detectionResults.final_confidence >= 60;
            
            console.log(`🎯 Detection complete: ${detectionResults.is_strategic ? 'STRATEGIC' : 'NON-STRATEGIC'} (${detectionResults.final_confidence}% confidence)`);
            
            return detectionResults;
            
        } catch (error) {
            console.error('❌ Multi-layer detection failed:', error);
            throw error;
        }
    }
}

export default StrategicItemsRAG;
