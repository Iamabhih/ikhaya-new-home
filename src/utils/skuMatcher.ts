// src/utils/skuMatcher.ts
// Enhanced SKU Extraction and Matching Utility for Product Images

export interface ExtractedSKU {
  value: string;
  confidence: number;
  source: 'exact' | 'numeric' | 'multi' | 'path' | 'pattern' | 'fuzzy';
}

export interface MatchResult {
  productSku: string;
  extractedSku: ExtractedSKU;
  matchScore: number;
  matchType: 'exact' | 'fuzzy' | 'partial';
}

export class SKUMatcher {
  private skuCache = new Map<string, Set<string>>();
  private productIndex = new Map<string, any>();
  
  /**
   * Extract all possible SKUs from a filename or path
   */
  extractSKUs(filename: string, fullPath?: string): ExtractedSKU[] {
    const skus: ExtractedSKU[] = [];
    
    if (!filename || typeof filename !== 'string') return skus;
    
    // Clean filename - remove extension and trim
    const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff?)$/i, '');
    const cleanName = nameWithoutExt.trim();
    
    // 1. EXACT MATCH - Pure numeric filename (highest confidence)
    if (/^\d{3,8}$/.test(cleanName)) {
      skus.push({
        value: cleanName,
        confidence: 100,
        source: 'exact'
      });
      
      // Add zero-padded variations for 5-digit numbers
      if (cleanName.length === 5 && !cleanName.startsWith('0')) {
        skus.push({
          value: '0' + cleanName,
          confidence: 95,
          source: 'exact'
        });
      }
      
      // Remove leading zeros
      if (cleanName.startsWith('0') && cleanName.length > 3) {
        skus.push({
          value: cleanName.substring(1),
          confidence: 95,
          source: 'exact'
        });
      }
    }
    
    // 2. MULTI-SKU FILES (e.g., "445033.446723.png", "319027.319026.PNG")
    const multiSkuMatch = cleanName.match(/^(\d{3,8})(?:[._-](\d{3,8}))+$/);
    if (multiSkuMatch) {
      const allNumbers = cleanName.match(/\d{3,8}/g) || [];
      allNumbers.forEach((num, index) => {
        skus.push({
          value: num,
          confidence: 90 - (index * 5), // First SKU has higher confidence
          source: 'multi'
        });
      });
    }
    
    // 3. NUMERIC PATTERNS anywhere in filename
    const numericMatches = cleanName.match(/\b\d{3,8}\b/g) || [];
    numericMatches.forEach(num => {
      // Check if not already added with higher confidence
      if (!skus.some(s => s.value === num && s.confidence >= 70)) {
        let confidence = 70;
        
        // Boost confidence based on position
        if (cleanName.startsWith(num)) confidence = 85;
        else if (numericMatches.length === 1) confidence = 80;
        else if (cleanName.endsWith(num)) confidence = 75;
        
        skus.push({
          value: num,
          confidence,
          source: 'numeric'
        });
      }
    });
    
    // 4. PATH-BASED EXTRACTION
    if (fullPath) {
      const pathParts = fullPath.split('/').filter(p => p && p !== filename);
      pathParts.forEach(part => {
        // Check if folder name is a pure number
        if (/^\d{3,8}$/.test(part)) {
          if (!skus.some(s => s.value === part)) {
            skus.push({
              value: part,
              confidence: 70,
              source: 'path'
            });
          }
        }
        
        // Extract numbers from folder names
        const pathNumbers = part.match(/\b\d{3,8}\b/g) || [];
        pathNumbers.forEach(num => {
          if (!skus.some(s => s.value === num)) {
            skus.push({
              value: num,
              confidence: 65,
              source: 'path'
            });
          }
        });
      });
    }
    
    // 5. PATTERN EXTRACTION (SKU-123456, ITEM_123456, etc.)
    const patterns = [
      /(?:SKU|sku|ITEM|item|PRODUCT|product|PROD|prod)[_\-\s]?(\d{3,8})/g,
      /[A-Z]{2,}[_\-]?(\d{3,8})/g, // XX-123456 patterns
      /(\d{3,8})[_\-][A-Za-z]+/g,   // 123456-variant patterns
      /\[(\d{3,8})\]/g,             // [123456] patterns
      /\((\d{3,8})\)/g,             // (123456) patterns
      /^(\d{3,8})[_\-]/g,           // Starting with number
      /[_\-](\d{3,8})$/g,           // Ending with number
    ];
    
    patterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(cleanName)) !== null) {
        if (match[1] && !skus.some(s => s.value === match[1])) {
          skus.push({
            value: match[1],
            confidence: 60,
            source: 'pattern'
          });
        }
      }
    });
    
    // 6. FUZZY VARIATIONS for all found SKUs
    const uniqueSkus = new Set(skus.map(s => s.value));
    const fuzzyVariations: ExtractedSKU[] = [];
    
    uniqueSkus.forEach(sku => {
      // Zero padding variations
      if (/^\d+$/.test(sku)) {
        if (sku.length === 3) {
          fuzzyVariations.push(
            { value: '0' + sku, confidence: 50, source: 'fuzzy' },
            { value: '00' + sku, confidence: 45, source: 'fuzzy' },
            { value: '000' + sku, confidence: 40, source: 'fuzzy' }
          );
        }
        if (sku.length === 4 && !sku.startsWith('0')) {
          fuzzyVariations.push(
            { value: '0' + sku, confidence: 50, source: 'fuzzy' },
            { value: '00' + sku, confidence: 45, source: 'fuzzy' }
          );
        }
        if (sku.length === 5 && !sku.startsWith('0')) {
          fuzzyVariations.push({ value: '0' + sku, confidence: 50, source: 'fuzzy' });
        }
        
        // Remove leading zeros variations
        if (sku.startsWith('0')) {
          let trimmed = sku;
          while (trimmed.startsWith('0') && trimmed.length > 1) {
            trimmed = trimmed.substring(1);
            if (trimmed.length >= 3 && trimmed.length <= 8) {
              fuzzyVariations.push({ value: trimmed, confidence: 50, source: 'fuzzy' });
            }
          }
        }
      }
    });
    
    // Add fuzzy variations that don't already exist
    fuzzyVariations.forEach(fv => {
      if (!skus.some(s => s.value === fv.value)) {
        skus.push(fv);
      }
    });
    
    // Remove duplicates and sort by confidence (highest first)
    const uniqueResults = new Map<string, ExtractedSKU>();
    skus.forEach(sku => {
      const existing = uniqueResults.get(sku.value);
      if (!existing || existing.confidence < sku.confidence) {
        uniqueResults.set(sku.value, sku);
      }
    });
    
    return Array.from(uniqueResults.values())
      .sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Calculate match score between a product SKU and extracted SKUs
   */
  calculateMatchScore(productSku: string, extractedSKUs: ExtractedSKU[]): number {
    if (!productSku || extractedSKUs.length === 0) return 0;
    
    const normalizedProductSku = this.normalizeSKU(productSku);
    let bestScore = 0;
    
    for (const extracted of extractedSKUs) {
      const normalizedExtracted = this.normalizeSKU(extracted.value);
      
      // Exact match
      if (normalizedProductSku === normalizedExtracted) {
        bestScore = Math.max(bestScore, extracted.confidence);
      }
      // Zero-padding variations (remove all leading zeros and compare)
      else if (this.removeLeadingZeros(normalizedProductSku) === this.removeLeadingZeros(normalizedExtracted)) {
        bestScore = Math.max(bestScore, extracted.confidence * 0.9);
      }
      // One is contained in the other
      else if (normalizedProductSku.includes(normalizedExtracted) || normalizedExtracted.includes(normalizedProductSku)) {
        const lengthRatio = Math.min(normalizedProductSku.length, normalizedExtracted.length) / 
                          Math.max(normalizedProductSku.length, normalizedExtracted.length);
        bestScore = Math.max(bestScore, extracted.confidence * 0.7 * lengthRatio);
      }
      // Levenshtein distance for close matches
      else {
        const distance = this.levenshteinDistance(normalizedProductSku, normalizedExtracted);
        const maxLength = Math.max(normalizedProductSku.length, normalizedExtracted.length);
        const similarity = 1 - (distance / maxLength);
        
        if (similarity > 0.8) {
          bestScore = Math.max(bestScore, extracted.confidence * similarity * 0.6);
        }
      }
    }
    
    return Math.round(bestScore);
  }
  
  /**
   * Build an index of all products for fast lookup
   */
  buildProductIndex(products: Array<{ id: string; sku: string; [key: string]: any }>) {
    this.skuCache.clear();
    this.productIndex.clear();
    
    products.forEach(product => {
      if (!product.sku) return;
      
      // Store product by ID
      this.productIndex.set(product.id, product);
      
      const normalized = this.normalizeSKU(product.sku);
      
      // Add exact SKU
      if (!this.skuCache.has(normalized)) {
        this.skuCache.set(normalized, new Set());
      }
      this.skuCache.get(normalized)!.add(product.id);
      
      // Add variations
      const variations = this.generateVariations(product.sku);
      variations.forEach(variant => {
        const normalizedVariant = this.normalizeSKU(variant);
        if (!this.skuCache.has(normalizedVariant)) {
          this.skuCache.set(normalizedVariant, new Set());
        }
        this.skuCache.get(normalizedVariant)!.add(product.id);
      });
    });
  }
  
  /**
   * Find best matching product for extracted SKUs
   */
  findBestMatch(extractedSKUs: ExtractedSKU[], threshold: number = 60): MatchResult | null {
    let bestMatch: MatchResult | null = null;
    let bestScore = 0;
    
    for (const extracted of extractedSKUs) {
      const normalized = this.normalizeSKU(extracted.value);
      
      // Check direct match in cache
      if (this.skuCache.has(normalized)) {
        const productIds = this.skuCache.get(normalized)!;
        for (const productId of productIds) {
          const product = this.productIndex.get(productId);
          if (product) {
            const score = extracted.confidence;
            if (score > bestScore && score >= threshold) {
              bestScore = score;
              bestMatch = {
                productSku: product.sku,
                extractedSku: extracted,
                matchScore: score,
                matchType: 'exact'
              };
            }
          }
        }
      }
      
      // Check variations
      const withoutZeros = this.removeLeadingZeros(normalized);
      if (withoutZeros !== normalized && this.skuCache.has(withoutZeros)) {
        const productIds = this.skuCache.get(withoutZeros)!;
        for (const productId of productIds) {
          const product = this.productIndex.get(productId);
          if (product) {
            const score = extracted.confidence * 0.9;
            if (score > bestScore && score >= threshold) {
              bestScore = score;
              bestMatch = {
                productSku: product.sku,
                extractedSku: extracted,
                matchScore: score,
                matchType: 'fuzzy'
              };
            }
          }
        }
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Generate variations of a SKU for matching
   */
  private generateVariations(sku: string): string[] {
    const variations = new Set<string>();
    const normalized = this.normalizeSKU(sku);
    
    // Add original
    variations.add(sku);
    variations.add(normalized);
    
    // Only generate numeric variations for numeric SKUs
    if (/^\d+$/.test(normalized)) {
      // Add leading zeros
      if (normalized.length === 3) {
        variations.add('0' + normalized);
        variations.add('00' + normalized);
        variations.add('000' + normalized);
      }
      if (normalized.length === 4) {
        variations.add('0' + normalized);
        variations.add('00' + normalized);
      }
      if (normalized.length === 5) {
        variations.add('0' + normalized);
      }
      
      // Remove leading zeros
      variations.add(this.removeLeadingZeros(normalized));
    }
    
    return Array.from(variations);
  }
  
  /**
   * Normalize SKU for comparison
   */
  private normalizeSKU(sku: string): string {
    return sku.toLowerCase().trim();
  }
  
  /**
   * Remove leading zeros from numeric string
   */
  private removeLeadingZeros(str: string): string {
    if (/^\d+$/.test(str)) {
      return str.replace(/^0+/, '') || '0';
    }
    return str;
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

// Export a singleton instance for convenience
export const skuMatcher = new SKUMatcher();
