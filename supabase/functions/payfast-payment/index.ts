// Updated signature generation function for payfast-payment/index.ts

async function generateSignature(data: Record<string, string>, passphrase?: string): Promise<string> {
  // PayFast requires specific parameter order
  const orderedKeys = [
    'merchant_id',
    'merchant_key',
    'return_url',
    'cancel_url',
    'notify_url',
    'name_first',
    'name_last',
    'email_address',
    'cell_number',
    'm_payment_id',
    'amount',
    'item_name',
    'item_description',
    'custom_int1',
    'custom_int2',
    'custom_int3',
    'custom_int4',
    'custom_int5',
    'custom_str1',
    'custom_str2',
    'custom_str3',
    'custom_str4',
    'custom_str5',
    'email_confirmation',
    'confirmation_address',
    'payment_method',
    'subscription_type',
    'subscription_notify_email',
    'subscription_notify_webhook',
    'subscription_notify_buyer',
    'recurring_amount',
    'frequency',
    'cycles'
  ];

  // Build parameter string in correct order
  const paramStringArray: string[] = [];
  
  orderedKeys.forEach(key => {
    if (data.hasOwnProperty(key) && data[key] !== '') {
      // Don't encode here - just add raw values
      paramStringArray.push(`${key}=${data[key]}`);
    }
  });

  // Join with & to create parameter string
  let paramString = paramStringArray.join('&');
  
  // Add passphrase if provided (also unencoded)
  if (passphrase && passphrase !== '') {
    paramString += `&passphrase=${passphrase}`;
  }
  
  console.log('PayFast signature generation:');
  console.log('- Parameter string:', paramString);
  console.log('- String length:', paramString.length);

  // Generate MD5 hash
  const md5Hash = md5(paramString);
  
  console.log('- Generated signature:', md5Hash);
  return md5Hash;
}

// Also update the main function to ensure correct data format
// In the payfast-payment function, update the payfastData section:

    // Prepare PayFast parameters with proper formatting
    const payfastData: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${req.headers.get('origin')}/checkout/success?order_id=${orderId}`,
      cancel_url: `${req.headers.get('origin')}/checkout?cancelled=true`,
      notify_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payfast-webhook`,
      name_first: customerName.split(' ')[0] || '',
      name_last: customerName.split(' ').slice(1).join(' ') || '',
      email_address: customerEmail,
      cell_number: customerPhone || '',
      m_payment_id: orderId,
      amount: amount.toFixed(2),
      item_name: items.map(item => item.name).join(', ').substring(0, 100), // PayFast limit
      item_description: `Order ${orderId} - ${items.length} items`,
    }

    // IMPORTANT: Remove any undefined or null values before signature generation
    const cleanedData: Record<string, string> = {}
    for (const [key, value] of Object.entries(payfastData)) {
      if (value !== '' && value !== null && value !== undefined) {
        cleanedData[key] = String(value).trim(); // Ensure strings and trim whitespace
      }
    }

    // Generate signature
    const signature = await generateSignature(cleanedData, passphrase)
    cleanedData.signature = signature