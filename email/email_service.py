import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

SMTP_HOST = os.getenv('SMTP_HOST')
SMTP_PORT = int(os.getenv('SMTP_PORT', 465))   # por defecto 465
SMTP_USER = str(os.getenv('SMTP_USER'))
SMTP_PASS = str(os.getenv('SMTP_PASS'))
API_KEY = os.getenv('EMAIL_API_KEY')

def enviar_correo(destinatario, asunto, cuerpo_html):
    msg = MIMEMultipart("alternative")
    msg['Subject'] = asunto
    msg['From'] = SMTP_USER
    msg['To'] = destinatario
    msg.attach(MIMEText(cuerpo_html, 'html'))

    # Conexión SSL directa (puerto 465)
    with smtplib.SMTP_SSL(str(SMTP_HOST), SMTP_PORT, timeout=10) as server:
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, destinatario, msg.as_string())

@app.route('/send_email', methods=['POST'])
def send_email():
    if request.headers.get('X-API-Key') != API_KEY:
        return jsonify({"error": "No autorizado"}), 401

    data = request.get_json()
    if not all(k in data for k in ('to', 'subject', 'html')):
        return jsonify({"error": "Faltan campos obligatorios"}), 400

    try:
        enviar_correo(data['to'], data['subject'], data['html'])
        return jsonify({"message": "Correo enviado"}), 200
    except Exception as e:
        app.logger.error(f"Error al enviar correo: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500  # <-- str(e) evita el error de serialización

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8034)