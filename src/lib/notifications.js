/**
 * Unified notification dispatcher for Commissioner Alerts
 * Supports:
 * 1. Carrier Email-to-SMS Gateway (Verizon: @vtext.com)
 * 2. Discord Webhook (with @NAZQAR mention and rich embed)
 */

export const COMMISSIONER_CONFIG = {
  phone: process.env.COMMISSIONER_PHONE || '4802097790',
  carrier: process.env.COMMISSIONER_CARRIER || 'verizon',
  gatewayEmail: (process.env.COMMISSIONER_PHONE || '4802097790') + '@vtext.com',
  discordUsername: process.env.DISCORD_USERNAME || 'NAZQAR',
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
};

/**
 * Dispatches an SMS alert to Commissioner Eric via Verizon gateway
 */
export async function sendCarrierSms({ message, subject = 'CRFFL Alert' }) {
  const targetEmail = COMMISSIONER_CONFIG.gatewayEmail;

  if (COMMISSIONER_CONFIG.resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${COMMISSIONER_CONFIG.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CRFFL Newsroom <alerts@crffl.org>',
          to: [targetEmail],
          subject,
          text: message,
        }),
      });

      const data = await res.json();
      return { success: res.ok, provider: 'resend', data };
    } catch (err) {
      console.error('Failed to send carrier SMS via Resend:', err);
      return { success: false, error: err.message };
    }
  }

  // If no email dispatch key is configured yet, return target for configuration
  return {
    success: false,
    provider: 'unconfigured_email_service',
    message: `Ready for dispatch to Verizon gateway: ${targetEmail}. Add RESEND_API_KEY to enable automated email-to-SMS transmission.`,
  };
}

/**
 * Dispatches a Discord notification via Webhook
 */
export async function sendDiscordAlert({ message, weekNumber, title = 'CRFFL Commissioner Alert' }) {
  const webhookUrl = COMMISSIONER_CONFIG.discordWebhookUrl;

  if (!webhookUrl) {
    return {
      success: false,
      provider: 'unconfigured_discord_webhook',
      message: 'No DISCORD_WEBHOOK_URL configured. Add your channel webhook URL to enable instant Discord pings.',
    };
  }

  try {
    const payload = {
      content: `🚨 **${title}** (Attention: **@${COMMISSIONER_CONFIG.discordUsername}**)\n${message}`,
      embeds: [
        {
          title: `CRFFL Season VI • Week ${weekNumber || ''} Baseline Reminder`,
          description: message,
          color: 13938487, // Gold #d4af37
          fields: [
            {
              name: 'Dr. Vance Run Time',
              value: 'Wednesdays @ 2:00 PM Pacific',
              inline: true,
            },
            {
              name: 'Direct Submission Portal',
              value: '[Open Commissioner Rankings Bench](https://www.crffl.org/admin/rankings)',
              inline: true,
            },
          ],
          footer: {
            text: 'Columbia River Fantasy Football League • Newsroom Dispatch Desk',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return { success: res.ok, provider: 'discord', status: res.status };
  } catch (err) {
    console.error('Failed to send Discord alert:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Master dispatcher: sends both SMS and Discord baseline reminder
 */
export async function sendCommissionerBaselineReminder(weekNumber) {
  const alertText = `Dr. Vance is scheduled to run Power Rankings today at 2:00 PM. Submit your Week ${weekNumber} baseline rankings at https://crffl.org/admin/rankings`;

  const [smsResult, discordResult] = await Promise.all([
    sendCarrierSms({
      subject: `CRFFL Week ${weekNumber} Baseline`,
      message: alertText,
    }),
    sendDiscordAlert({
      weekNumber,
      message: alertText,
    }),
  ]);

  return {
    timestamp: new Date().toISOString(),
    week: weekNumber,
    sms: smsResult,
    discord: discordResult,
  };
}

