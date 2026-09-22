import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

/**
 * Envio de los avisos pendientes por correo.
 *
 * Reutiliza la configuracion SMTP que ya usa la facturacion. Si no esta
 * configurada NO se marca nada como enviado: asi el aviso sigue pendiente y
 * sale en cuanto se configure, en vez de perderse en silencio.
 */

function smtpConfig() {
  const host = process.env.EMAIL_SERVER_HOST || process.env.SMTP_HOST;
  const user = process.env.EMAIL_SERVER_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD || process.env.SMTP_PASSWORD;
  const port = Number(process.env.EMAIL_SERVER_PORT || process.env.SMTP_PORT || 587);
  const from = process.env.EMAIL_FROM || user;

  if (!host || !user || !pass || !from) return null;
  return { host, port, user, pass, from };
}

export interface EmailRun {
  pending: number;
  sent: number;
  failed: number;
  /** El correo no esta configurado; no se ha intentado nada. */
  skippedNoConfig: boolean;
}

export async function sendPendingNotificationEmails(limit = 20): Promise<EmailRun> {
  const pendientes = await prisma.notification.findMany({
    where: { emailedAt: null },
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  const run: EmailRun = {
    pending: pendientes.length,
    sent: 0,
    failed: 0,
    skippedNoConfig: false,
  };
  if (pendientes.length === 0) return run;

  const cfg = smtpConfig();
  if (!cfg) {
    // A proposito no se marcan como enviados: quedan pendientes para cuando
    // haya configuracion. Un aviso perdido en silencio es peor que uno tardio.
    run.skippedNoConfig = true;
    return run;
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  const base = process.env.NEXTAUTH_URL || 'https://quickbokks-clone.vercel.app';

  for (const n of pendientes) {
    if (!n.user?.email) {
      run.failed += 1;
      continue;
    }
    try {
      await transporter.sendMail({
        from: cfg.from,
        to: n.user.email,
        subject: n.title,
        text: `${n.body}\n\n${base}${n.link ?? ''}`,
        html: render(n.title, n.body, n.link ? `${base}${n.link}` : null, n.level),
      });
      await prisma.notification.update({
        where: { id: n.id },
        data: { emailedAt: new Date() },
      });
      run.sent += 1;
    } catch (error) {
      console.error('No se pudo enviar el aviso por correo:', error);
      run.failed += 1;
    }
  }

  return run;
}

function render(title: string, body: string, link: string | null, level: string): string {
  const color = level === 'danger' ? '#DC2626' : '#D97706';

  return `<!DOCTYPE html>
<html lang="es"><body style="margin:0;padding:24px;background:#F3F4F6;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <table role="presentation" style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
    <tr><td style="background:${color};height:5px"></td></tr>
    <tr><td style="padding:28px">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6B7280">COMPUTOPLUS</p>
      <h1 style="margin:0 0 14px;font-size:20px;color:#0D2942">${escape(title)}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151">${escape(body)}</p>
      ${
        link
          ? `<a href="${escape(link)}" style="display:inline-block;background:#2CA01C;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600;font-size:14px">Ver el control de millas</a>`
          : ''
      }
    </td></tr>
  </table>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
