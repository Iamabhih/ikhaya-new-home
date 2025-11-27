/**
 * Shared SKU Extraction Module
 *
 * Consolidated, optimized SKU extraction logic used across all image linking functions.
 * Single source of truth for SKU pattern matching and confidence scoring.
 */

export interface ExtractedSKU {
  sku: string;
  confidence: number;
  source: 'exact_numeric' | 'zero_padded' | 'multi_sku' | 'contextual' | 'path_based' | 'pattern_match' | 'fallback';
}

export interface ExtractionOptions {
  minSkuLength?: number;
  maxSkuLength?: number;
  enableZeroPadding?: boolean;
  enableMultiSku?: boolean;
  enablePathExtraction?: boolean;
  minConfidence?: number;
  debug?: boolean;
}

const DEFAULT_OPTIONS: ExtractionOptions = {
  minSkuLength: 3,
  maxSkuLength: 8,
  enableZeroPadding: true,
  enableMultiSku: true,
  enablePathExtraction: true,
  minConfidence: 30,
  debug: false,
};

/**
 * Clean filename by removing extension and normalizing
 */
function cleanFilename(filename: string): string {
  return filename
    .replace(/\.(jpg|jpeg|png|webp|gif|bmp|svg|tiff?)$/i, '')
    .replace(/\.+$/, '')
    .trim();
}

/**
 * Check if a string is a valid SKU based on length constraints
 */
function isValidSku(sku: string, options: ExtractionOptions): boolean {
  const { minSkuLength = 3, maxSkuLength = 8 } = options;
  return /^\d+$/.test(sku) && sku.length >= minSkuLength && sku.length <= maxSkuLength;
}

/**
 * Generate zero-padded variations of a SKU
 */
function generatePaddedVariations(sku: string, options: ExtractionOptions): ExtractedSKU[] {
  const variations: ExtractedSKU[] = [];
  const { maxSkuLength = 8 } = options;

  // Add leading zeros
  if (sku.length < maxSkuLength && !sku.startsWith('0')) {
    const padLengths = [6, 7, 8].filter(len => len > sku.length && len <= maxSkuLength);
    padLengths.forEach((targetLength, index) => {
      const padded = sku.padStart(targetLength, '0');
      variations.push({
        sku: padded,
        confidence: 94 - index * 2,
        source: 'zero_padded',
      });
    });
  }

  // Remove leading zeros
  if (sku.startsWith('0') && sku.length > 3) {
    const trimmed = sku.replace(/^0+/, '');
    if (trimmed.length >= 3) {
      variations.push({
        sku: trimmed,
        confidence: 93,
        source: 'zero_padded',
      });
    }
  }

  return variations;
}

/**
 * Extract SKUs from multi-SKU filenames (e.g., "12345.67890.11111.jpg")
 */
function extractMultiSkus(cleanName: string, options: ExtractionOptions): ExtractedSKU[] {
  const results: ExtractedSKU[] = [];

  const multiSkuPatterns = [
    /^(\d{3,8}(?:\.\d{3,8})+)\.?$/,     // Dots: 12345.67890.11111
    /^(\d{3,8}(?:-\d{3,8})+)-?$/,       // Dashes: 12345-67890-11111
    /^(\d{3,8}(?:_\d{3,8})+)_?$/,       // Underscores: 12345_67890_11111
    /^(\d{3,8}(?:[._-]\d{3,8})+)[._-]?/, // Mixed separators
  ];

  for (const pattern of multiSkuPatterns) {
    const match = cleanName.match(pattern);
    if (match) {
      const allNumbers = match[1].match(/\d{3,8}/g) || [];
      const uniqueNumbers = [...new Set(allNumbers)];

      uniqueNumbers.forEach((sku, index) => {
        if (isValidSku(sku, options)) {
          const confidence = Math.max(92 - (index * 3), 70);
          results.push({
            sku,
            confidence,
            source: 'multi_sku',
          });
        }
      });

      if (results.length > 0) break; // Use first matching pattern
    }
  }

  return results;
}

/**
 * Extract SKUs using contextual patterns
 */
function extractContextualSkus(cleanName: string, options: ExtractionOptions): ExtractedSKU[] {
  const results: ExtractedSKU[] = [];

  const contextualPatterns: Array<{ pattern: RegExp; confidence: number; name: string }> = [
    { pattern: /(?:^|[^\d])(\d{4,8})(?:[^\d]|$)/, confidence: 88, name: 'bounded' },
    { pattern: /IMG_(\d{4,8})/, confidence: 85, name: 'img_prefix' },
    { pattern: /PROD_(\d{4,8})/, confidence: 85, name: 'prod_prefix' },
    { pattern: /SKU_(\d{4,8})/, confidence: 90, name: 'sku_prefix' },
    { pattern: /[Pp]roduct[_\s]*(\d{4,8})/, confidence: 82, name: 'product_prefix' },
    { pattern: /^(\d{4,8})(?:\.|_|-)/, confidence: 80, name: 'leading_number' },
    { pattern: /(?:\.|_|-)(\d{4,8})$/, confidence: 78, name: 'trailing_number' },
  ];

  for (const { pattern, confidence, name } of contextualPatterns) {
    const match = cleanName.match(pattern);
    if (match && match[1] && isValidSku(match[1], options)) {
      if (!results.some(r => r.sku === match[1])) {
        results.push({
          sku: match[1],
          confidence,
          source: 'contextual',
        });
      }
    }
  }

  return results;
}

/**
 * Extract SKUs from file path components
 */
function extractPathSkus(fullPath: string, options: ExtractionOptions): ExtractedSKU[] {
  const results: ExtractedSKU[] = [];

  if (!fullPath || !fullPath.includes('/')) return results;

  const pathParts = fullPath.split('/');
  pathParts.forEach(part => {
    if (isValidSku(part, options)) {
      results.push({
        sku: part,
        confidence: 60,
        source: 'path_based',
      });
    }
  });

  return results;
}

/**
 * Fallback extraction for any numeric sequences
 */
function extractFallbackSkus(cleanName: string, options: ExtractionOptions): ExtractedSKU[] {
  const results: ExtractedSKU[] = [];
  const { minSkuLength = 3, maxSkuLength = 8 } = options;

  const pattern = new RegExp(`\\d{${minSkuLength},${maxSkuLength}}`, 'g');
  const matches = cleanName.match(pattern) || [];

  matches.forEach((sku, index) => {
    if (!results.some(r => r.sku === sku)) {
      const confidence = Math.max(40 - (index * 5), 20);
      results.push({
        sku,
        confidence,
        source: 'fallback',
      });
    }
  });

  return results;
}

/**
 * Main SKU extraction function - consolidated from all implementations
 *
 * @param filename - The image filename to extract SKUs from
 * @param fullPath - Optional full path for path-based extraction
 * @param options - Extraction configuration options
 * @returns Array of extracted SKUs sorted by confidence (highest first)
 */
export function extractSKUsFromFilename(
  filename: string,
  fullPath?: string,
  options: ExtractionOptions = {}
): ExtractedSKU[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { debug, minConfidence = 30 } = opts;

  if (!filename || typeof filename !== 'string') {
    return [];
  }

  const cleanName = cleanFilename(filename);
  const allSkus: ExtractedSKU[] = [];

  if (debug) {
    console.log(`[SKU] Extracting from: "${filename}" -> "${cleanName}"`);
  }

  // Strategy 1: Exact numeric filename (highest confidence)
  if (isValidSku(cleanName, opts)) {
    allSkus.push({
      sku: cleanName,
      confidence: 100,
      source: 'exact_numeric',
    });

    if (debug) console.log(`[SKU] Exact match: ${cleanName}`);

    // Generate padded variations for exact matches
    if (opts.enableZeroPadding) {
      allSkus.push(...generatePaddedVariations(cleanName, opts));
    }
  }

  // Strategy 2: Multi-SKU patterns
  if (opts.enableMultiSku && allSkus.length === 0) {
    const multiSkus = extractMultiSkus(cleanName, opts);
    if (multiSkus.length > 0) {
      allSkus.push(...multiSkus);
      if (debug) console.log(`[SKU] Multi-SKU: ${multiSkus.map(s => s.sku).join(', ')}`);
    }
  }

  // Strategy 3: Contextual patterns
  if (allSkus.length === 0) {
    const contextualSkus = extractContextualSkus(cleanName, opts);
    allSkus.push(...contextualSkus);
    if (debug && contextualSkus.length > 0) {
      console.log(`[SKU] Contextual: ${contextualSkus.map(s => s.sku).join(', ')}`);
    }
  }

  // Strategy 4: Path-based extraction
  if (opts.enablePathExtraction && fullPath) {
    const pathSkus = extractPathSkus(fullPath, opts);
    pathSkus.forEach(sku => {
      if (!allSkus.some(s => s.sku === sku.sku)) {
        allSkus.push(sku);
      }
    });
    if (debug && pathSkus.length > 0) {
      console.log(`[SKU] Path-based: ${pathSkus.map(s => s.sku).join(', ')}`);
    }
  }

  // Strategy 5: Fallback extraction
  if (allSkus.length === 0) {
    const fallbackSkus = extractFallbackSkus(cleanName, opts);
    allSkus.push(...fallbackSkus);
    if (debug && fallbackSkus.length > 0) {
      console.log(`[SKU] Fallback: ${fallbackSkus.map(s => s.sku).join(', ')}`);
    }
  }

  // Remove duplicates, filter by minimum confidence, and sort by confidence
  const uniqueSkus = allSkus
    .filter((sku, index, self) =>
      index === self.findIndex(s => s.sku === sku.sku)
    )
    .filter(sku => sku.confidence >= minConfidence)
    .sort((a, b) => b.confidence - a.confidence);

  if (debug) {
    console.log(`[SKU] Final: ${uniqueSkus.length} SKUs - [${
      uniqueSkus.map(s => `${s.sku}(${s.confidence}%)`).join(', ')
    }]`);
  }

  return uniqueSkus;
}

/**
 * Batch extract SKUs from multiple filenames efficiently
 */
export function batchExtractSKUs(
  files: Array<{ filename: string; fullPath?: string }>,
  options: ExtractionOptions = {}
): Map<string, ExtractedSKU[]> {
  const results = new Map<string, ExtractedSKU[]>();

  for (const file of files) {
    results.set(file.filename, extractSKUsFromFilename(file.filename, file.fullPath, options));
  }

  return results;
}

/**
 * Pre-build a product SKU lookup index for O(1) matching
 */
export interface ProductSkuIndex {
  exact: Map<string, any>;
  normalized: Map<string, any>;
  padded: Map<string, any>;
}

export function buildProductSkuIndex(products: Array<{ id: string; sku: string; name?: string }>): ProductSkuIndex {
  const index: ProductSkuIndex = {
    exact: new Map(),
    normalized: new Map(),
    padded: new Map(),
  };

  for (const product of products) {
    if (!product.sku) continue;

    const sku = product.sku;
    const normalizedSku = sku.toLowerCase().trim();

    // Exact match
    index.exact.set(sku, product);
    index.exact.set(normalizedSku, product);

    // Normalized (without leading zeros)
    const trimmedSku = normalizedSku.replace(/^0+/, '') || normalizedSku;
    if (!index.normalized.has(trimmedSku)) {
      index.normalized.set(trimmedSku, product);
    }

    // Padded variations
    if (/^\d+$/.test(normalizedSku)) {
      [6, 7, 8].forEach(len => {
        if (normalizedSku.length < len) {
          const padded = normalizedSku.padStart(len, '0');
          if (!index.padded.has(padded)) {
            index.padded.set(padded, product);
          }
        }
      });
    }
  }

  return index;
}

/**
 * Find matching product using pre-built index (O(1) lookup)
 */
export function findMatchingProduct(
  index: ProductSkuIndex,
  targetSku: string
): { product: any; matchType: 'exact' | 'normalized' | 'padded' } | null {
  const normalizedTarget = targetSku.toLowerCase().trim();

  // Priority 1: Exact match
  let product = index.exact.get(targetSku) || index.exact.get(normalizedTarget);
  if (product) {
    return { product, matchType: 'exact' };
  }

  // Priority 2: Normalized match (without leading zeros)
  const trimmedTarget = normalizedTarget.replace(/^0+/, '') || normalizedTarget;
  product = index.normalized.get(trimmedTarget);
  if (product) {
    return { product, matchType: 'normalized' };
  }

  // Priority 3: Padded match
  product = index.padded.get(normalizedTarget);
  if (product) {
    return { product, matchType: 'padded' };
  }

  // Try padding the target itself
  if (/^\d+$/.test(normalizedTarget)) {
    for (const len of [6, 7, 8]) {
      const padded = normalizedTarget.padStart(len, '0');
      product = index.exact.get(padded) || index.padded.get(padded);
      if (product) {
        return { product, matchType: 'padded' };
      }
    }
  }

  return null;
}

/**
 * Calculate match confidence between extracted SKU and product SKU
 */
export function calculateMatchConfidence(
  extractedSku: ExtractedSKU,
  productSku: string,
  matchType: 'exact' | 'normalized' | 'padded'
): number {
  let baseConfidence = extractedSku.confidence;

  // Adjust based on match type
  switch (matchType) {
    case 'exact':
      // No adjustment for exact match
      break;
    case 'normalized':
      baseConfidence *= 0.95;
      break;
    case 'padded':
      baseConfidence *= 0.90;
      break;
  }

  return Math.round(baseConfidence);
}
