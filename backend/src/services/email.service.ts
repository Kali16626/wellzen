const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxQ3n2yRR8yHSC25LVXrk1Q9HKP_6f-jh_I8_uBGTM4f44beRkHLWiKfYCDjmD3H57H/exec';

export const sendRealEmail = async (to: string, subject: string, text: string, html?: string): Promise<boolean> => {
  try {
    console.log(`[Email Service] Sending email to ${to} via HTTP...`);
    
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: to,
        subject: subject,
        html: html || text // Use html if available, else text
      })
    });

    if (response.ok || response.status === 302) {
      console.log(`✅ Real Email sent successfully to ${to} via App Script!`);
      return true;
    } else {
      console.error(`❌ Google App Script returned an error: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to send real email via App Script:', error);
    return false;
  }
};
