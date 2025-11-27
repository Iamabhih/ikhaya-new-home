/**
 * Shared SKU Extraction Module
 *
 * Consolidated, optimized SKU extraction logic used across all image linking functions.
 * Single source of truth for SKU pattern matching and confidence scoring.
 */

export interface ExtractedSKU {
  sku: string;
  confidence: number;
  source: 'exact_numeric' | 'exact_alphanumeric' | 'alphanumeric_base' | 'zero_padded' | 'multi_sku' | 'contextual' | 'path_based' | 'pattern_match' | 'fallback';
}

export interface ExtractionOptions {
  minSkuLength?: number;
  maxSkuLength?: number;
  enableZeroPadding?: boolean;
  enableMultiSku?: boolean;
  enablePathExtraction?: boolean;
  enableAlphanumeric?: boolean;
  minConfidence?: number;
  debug?: boolean;
}

const DEFAULT_OPTIONS: ExtractionOptions = {
  minSkuLength: 3,
  maxSkuLength: 10,  // Increased to handle alphanumeric suffixes
  enableZeroPadding: true,
  enableMultiSku: true,
  enablePathExtraction: true,
  enableAlphanumeric: true,
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
 * Check if a string is a valid numeric SKU based on length constraints
 */
function isValidNumericSku(sku: string, options: ExtractionOptions): boolean {
  const { minSkuLength = 3, maxSkuLength = 10 } = options;
  return /^\d+$/.test(sku) && sku.length >= minSkuLength && sku.length <= maxSkuLength;
}

/**
 * Check if a string is a valid alphanumeric SKU (e.g., 444492b, 123456abc)
 * Pattern: digits followed by 1-3 letters
 */
function isValidAlphanumericSku(sku: string, options: ExtractionOptions): boolean {
  const { minSkuLength = 3, maxSkuLength = 10 } = options;
  // Pattern: 3+ digits followed by 1-3 letters (case insensitive)
  const alphanumericPattern = /^(\d{3,})[a-zA-Z]{1,3}$/;
  return alphanumericPattern.test(sku) && sku.length >= minSkuLength && sku.length <= maxSkuLength;
}

/**
 * Extract the numeric base from an alphanumeric SKU (e.g., 444492b -> 444492)
 */
function extractNumericBase(sku: string): string | null {
  const match = sku.match(/^(\d+)/);
  return match ? match[1] : null;
}

/**
 * Legacy alias for backward compatibility
 */
function isValidSku(sku: string, options: ExtractionOptions): boolean {
  return isValidNumericSku(sku, options);
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
 * Extract alphanumeric SKUs from filename (e.g., "444492b.png" -> ["444492b", "444492"])
 * Handles patterns like: 444492b, 123456abc, 789012A
 */
function extractAlphanumericSkus(cleanName: string, options: ExtractionOptions): ExtractedSKU[] {
  const results: ExtractedSKU[] = [];
  const { minSkuLength = 3, maxSkuLength = 10 } = options;

  // Pattern 1: Exact alphanumeric match (filename is just the SKU with letter suffix)
  // e.g., "444492b" from "444492b.png"
  if (isValidAlphanumericSku(cleanName, options)) {
    results.push({
      sku: cleanName.toLowerCase(),
      confidence: 98,
      source: 'exact_alphanumeric',
    });

    // Also extract the numeric base for fallback matching
    const numericBase = extractNumericBase(cleanName);
    if (numericBase && numericBase.length >= minSkuLength) {
      results.push({
        sku: numericBase,
        confidence: 92,
        source: 'alphanumeric_base',
      });
    }
  }

  // Pattern 2: Alphanumeric sequences within the filename
  // e.g., "product_444492b_image" -> "444492b"
  const alphanumericPatterns: Array<{ pattern: RegExp; confidence: number }> = [
    // Standalone alphanumeric: digits followed by letters
    { pattern: /(?:^|[^a-zA-Z\d])(\d{3,8}[a-zA-Z]{1,3})(?:[^a-zA-Z\d]|$)/gi, confidence: 90 },
    // With prefix/suffix separators: _444492b_ or -444492b-
    { pattern: /[_\-.](\d{3,8}[a-zA-Z]{1,3})[_\-.]?/gi, confidence: 88 },
    // At end of filename: product444492b
    { pattern: /[a-zA-Z](\d{3,8}[a-zA-Z]{1,3})$/gi, confidence: 85 },
  ];

  for (const { pattern, confidence } of alphanumericPatterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(cleanName)) !== null) {
      const sku = match[1]?.toLowerCase();
      if (sku && sku.length >= minSkuLength && sku.length <= maxSkuLength) {
        if (!results.some(r => r.sku === sku)) {
          results.push({
            sku,
            confidence,
            source: 'exact_alphanumeric',
          });

          // Also extract the numeric base
          const numericBase = extractNumericBase(sku);
          if (numericBase && numericBase.length >= minSkuLength && !results.some(r => r.sku === numericBase)) {
            results.push({
              sku: numericBase,
              confidence: confidence - 6,
              source: 'alphanumeric_base',
            });
          }
        }
      }
    }
    if (results.length > 0) break;
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
  // e.g., "455123.png" -> "455123"
  if (isValidSku(cleanName, opts)) {
    allSkus.push({
      sku: cleanName,
      confidence: 100,
      source: 'exact_numeric',
    });

    if (debug) console.log(`[SKU] Exact numeric match: ${cleanName}`);

    // Generate padded variations for exact matches
    if (opts.enableZeroPadding) {
      allSkus.push(...generatePaddedVariations(cleanName, opts));
    }
  }

  // Strategy 2: Alphanumeric SKU patterns (high confidence)
  // e.g., "444492b.png" -> "444492b" + "444492" (numeric base)
  if (opts.enableAlphanumeric && allSkus.length === 0) {
    const alphanumericSkus = extractAlphanumericSkus(cleanName, opts);
    if (alphanumericSkus.length > 0) {
      allSkus.push(...alphanumericSkus);
      if (debug) console.log(`[SKU] Alphanumeric: ${alphanumericSkus.map(s => `${s.sku}(${s.source})`).join(', ')}`);
    }
  }

  // Strategy 3: Multi-SKU patterns
  // e.g., "455123.455124.png" -> ["455123", "455124"]
  if (opts.enableMultiSku && allSkus.length === 0) {
    const multiSkus = extractMultiSkus(cleanName, opts);
    if (multiSkus.length > 0) {
      allSkus.push(...multiSkus);
      if (debug) console.log(`[SKU] Multi-SKU: ${multiSkus.map(s => s.sku).join(', ')}`);
    }
  }

  // Strategy 4: Contextual patterns
  if (allSkus.length === 0) {
    const contextualSkus = extractContextualSkus(cleanName, opts);
    allSkus.push(...contextualSkus);
    if (debug && contextualSkus.length > 0) {
      console.log(`[SKU] Contextual: ${contextualSkus.map(s => s.sku).join(', ')}`);
    }
  }

  // Strategy 5: Path-based extraction
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

  // Strategy 6: Fallback extraction
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
  exact: Map<string, any>;           // Exact SKU matches (case-insensitive)
  normalized: Map<string, any>;      // Without leading zeros
  padded: Map<string, any>;          // Zero-padded variations
  alphanumeric: Map<string, any>;    // Alphanumeric SKUs (e.g., "444492b")
  numericBase: Map<string, any>;     // Numeric base of alphanumeric SKUs (e.g., "444492" from "444492b")
}

export function buildProductSkuIndex(products: Array<{ id: string; sku: string; name?: string }>): ProductSkuIndex {
  const index: ProductSkuIndex = {
    exact: new Map(),
    normalized: new Map(),
    padded: new Map(),
    alphanumeric: new Map(),
    numericBase: new Map(),
  };

  for (const product of products) {
    if (!product.sku) continue;

    const sku = product.sku;
    const normalizedSku = sku.toLowerCase().trim();

    // Exact match (case-sensitive and case-insensitive)
    index.exact.set(sku, product);
    index.exact.set(normalizedSku, product);

    // Check if this is an alphanumeric SKU (e.g., "444492b", "123456abc")
    const alphanumericMatch = normalizedSku.match(/^(\d{3,})[a-zA-Z]{1,3}$/);
    if (alphanumericMatch) {
      // Store the full alphanumeric SKU
      index.alphanumeric.set(normalizedSku, product);

      // Extract and store the numeric base for fallback matching
      const numericBase = alphanumericMatch[1];
      if (!index.numericBase.has(numericBase)) {
        index.numericBase.set(numericBase, product);
      }
    }

    // Normalized (without leading zeros)
    const trimmedSku = normalizedSku.replace(/^0+/, '') || normalizedSku;
    if (!index.normalized.has(trimmedSku)) {
      index.normalized.set(trimmedSku, product);
    }

    // Padded variations (only for pure numeric SKUs)
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
 * Supports exact, normalized, padded, alphanumeric, and numeric base matching
 */
export function findMatchingProduct(
  index: ProductSkuIndex,
  targetSku: string
): { product: any; matchType: 'exact' | 'normalized' | 'padded' | 'alphanumeric' | 'numeric_base' } | null {
  const normalizedTarget = targetSku.toLowerCase().trim();

  // Priority 1: Exact match
  let product = index.exact.get(targetSku) || index.exact.get(normalizedTarget);
  if (product) {
    return { product, matchType: 'exact' };
  }

  // Priority 2: Alphanumeric match (e.g., "444492b" -> product with SKU "444492b")
  product = index.alphanumeric.get(normalizedTarget);
  if (product) {
    return { product, matchType: 'alphanumeric' };
  }

  // Priority 3: Numeric base match (e.g., "444492" extracted from "444492b" -> product with SKU "444492b")
  // This handles the case where the filename has just the numeric part but the product has alphanumeric SKU
  product = index.numericBase.get(normalizedTarget);
  if (product) {
    return { product, matchType: 'numeric_base' };
  }

  // Priority 4: Normalized match (without leading zeros)
  const trimmedTarget = normalizedTarget.replace(/^0+/, '') || normalizedTarget;
  product = index.normalized.get(trimmedTarget);
  if (product) {
    return { product, matchType: 'normalized' };
  }

  // Priority 5: Padded match
  product = index.padded.get(normalizedTarget);
  if (product) {
    return { product, matchType: 'padded' };
  }

  // Priority 6: Try padding the target itself (for numeric SKUs)
  if (/^\d+$/.test(normalizedTarget)) {
    for (const len of [6, 7, 8]) {
      const padded = normalizedTarget.padStart(len, '0');
      product = index.exact.get(padded) || index.padded.get(padded);
      if (product) {
        return { product, matchType: 'padded' };
      }
    }
  }

  // Priority 7: Try extracting numeric base from alphanumeric target
  // e.g., "444492b" filename -> check if product "444492" exists
  const alphanumericMatch = normalizedTarget.match(/^(\d{3,})[a-zA-Z]{1,3}$/);
  if (alphanumericMatch) {
    const numericBase = alphanumericMatch[1];
    // Check exact match for numeric base
    product = index.exact.get(numericBase);
    if (product) {
      return { product, matchType: 'numeric_base' };
    }
    // Check normalized match
    product = index.normalized.get(numericBase.replace(/^0+/, '') || numericBase);
    if (product) {
      return { product, matchType: 'normalized' };
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
  matchType: 'exact' | 'normalized' | 'padded' | 'alphanumeric' | 'numeric_base'
): number {
  let baseConfidence = extractedSku.confidence;

  // Adjust based on match type
  switch (matchType) {
    case 'exact':
      // No adjustment for exact match
      break;
    case 'alphanumeric':
      // High confidence for alphanumeric matches
      baseConfidence *= 0.98;
      break;
    case 'numeric_base':
      // Good confidence for numeric base matches (fallback from alphanumeric)
      baseConfidence *= 0.92;
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
