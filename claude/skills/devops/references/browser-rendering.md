# Representación del navegador Cloudflare

Automatización del navegador sin cabeza con Puppeteer/Playwright en Cloudflare Workers.

## Configuración

**wrangler.toml:**
```toml
name = "browser-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

browser = { binding = "MYBROWSER" }
```

## Trabajador de captura de pantalla básico

```typescript
import puppeteer from '@cloudflare/puppeteer';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const browser = await puppeteer.launch(env.MYBROWSER);
    const page = await browser.newPage();

    await page.goto('https://example.com', { waitUntil: 'networkidle2' });
    const screenshot = await page.screenshot({ type: 'png' });

    await browser.close();

    return new Response(screenshot, {
      headers: { 'Content-Type': 'image/png' }
    });
  }
};
```

## Reutilización de sesiones (optimización de costos)

```typescript
// Disconnect instead of close
await browser.disconnect();

// Retrieve and reconnect
const sessions = await puppeteer.sessions(env.MYBROWSER);
const freeSession = sessions.find(s => !s.connectionId);

if (freeSession) {
  const browser = await puppeteer.connect(env.MYBROWSER, freeSession.sessionId);
}
```

## Generación de PDF

```typescript
const browser = await puppeteer.launch(env.MYBROWSER);
const page = await browser.newPage();

await page.setContent(`
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        body { font-family: Arial; padding: 50px; }
        h1 { color: #2c3e50; }
      </style>
    </head>
    <body>
      <h1>Certificate</h1>
      <p>Awarded to: <strong>John Doe</strong></p>
    </body>
  </html>
`);

const pdf = await page.pdf({
  format: 'A4',
  printBackground: true,
  margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
});

await browser.close();

return new Response(pdf, {
  headers: { 'Content-Type': 'application/pdf' }
});
```

## Objetos duraderos para sesiones persistentes

```typescript
export class Browser {
  state: DurableObjectState;
  browser: any;
  lastUsed: number;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.lastUsed = Date.now();
  }

  async fetch(request: Request, env: Env) {
    if (!this.browser) {
      this.browser = await puppeteer.launch(env.MYBROWSER);
    }

    this.lastUsed = Date.now();
    await this.state.storage.setAlarm(Date.now() + 10000);

    const page = await this.browser.newPage();
    const url = new URL(request.url).searchParams.get('url');
    await page.goto(url);
    const screenshot = await page.screenshot();
    await page.close();

    return new Response(screenshot, {
      headers: { 'Content-Type': 'image/png' }
    });
  }

  async alarm() {
    if (Date.now() - this.lastUsed > 60000) {
      await this.browser?.close();
      this.browser = null;
    } else {
      await this.state.storage.setAlarm(Date.now() + 10000);
    }
  }
}
```

## Web Scraper impulsado por IA

```typescript
import { Ai } from '@cloudflare/ai';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const browser = await puppeteer.launch(env.MYBROWSER);
    const page = await browser.newPage();
    await page.goto('https://news.ycombinator.com');
    const content = await page.content();
    await browser.close();

    const ai = new Ai(env.AI);
    const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'Extract top 5 article titles and URLs as JSON'
        },
        { role: 'user', content: content }
      ]
    });

    return Response.json(response);
  }
};
```

## Rastreador con colas

```typescript
export default {
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    const browser = await puppeteer.launch(env.MYBROWSER);

    for (const message of batch.messages) {
      const page = await browser.newPage();
      await page.goto(message.body.url);

      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => a.href);
      });

      for (const link of links) {
        await env.QUEUE.send({ url: link });
      }

      await page.close();
      message.ack();
    }

    await browser.close();
  }
};
```

## Configuración

### Se acabó el tiempo
```typescript
await page.goto(url, {
  timeout: 60000,  // 60 seconds max
  waitUntil: 'networkidle2'
});

await page.waitForSelector('.content', { timeout: 45000 });
```

### Ventana gráfica
```typescript
await page.setViewport({ width: 1920, height: 1080 });
```

### Opciones de captura de pantalla
```typescript
const screenshot = await page.screenshot({
  type: 'png',       // 'png' | 'jpeg' | 'webp'
  quality: 90,       // JPEG/WebP only
  fullPage: true,    // Full scrollable page
  clip: {            // Crop
    x: 0, y: 0,
    width: 800,
    height: 600
  }
});
```

## Límites y precios

### Plan gratuito
- 10 minutos/día
- 3 navegadores simultáneos
- 3 nuevos navegadores/minuto

### Plan pago
- 10 horas/mes incluidas
- 30 navegadores simultáneos
- 30 nuevos navegadores/minuto
- $0.09/hora excedente
- $2.00/exceso de navegador simultáneo

### Optimización de costos
1. uso`disconnect()`en lugar de`close()`
2. Habilite Keep-Alive (máximo 10 minutos)
3. Pestañas agrupadas con contextos del navegador
4. Estado de autenticación de caché con KV
5. Implementar la limpieza de objetos duraderos

## Mejores prácticas

### Gestión de sesiones
- Usar siempre`disconnect()`para reutilizar
- Implementar la agrupación de sesiones.
- Seguimiento de ID y estados de sesión

### Rendimiento
- Contenido de caché en KV
- Utilice contextos de navegador frente a varios navegadores
- Elija apropiado`waitUntil`estrategia
- Establecer tiempos de espera realistas

### Manejo de errores
- Manejar los errores de tiempo de espera con gracia
- Consulta la disponibilidad de la sesión antes de conectarte.
- Validar las respuestas antes del almacenamiento en caché.

### Seguridad
- Validar las URL proporcionadas por el usuario
- Implementar autenticación
- Desinfectar el contenido extraído
- Establecer encabezados CORS apropiados

## Solución de problemas

**Errores de tiempo de espera:**
```typescript
await page.goto(url, {
  timeout: 60000,
  waitUntil: 'domcontentloaded'  // Faster than networkidle2
});
```

**Problemas de memoria:**
```typescript
await page.close();  // Close pages
await browser.disconnect();  // Reuse session
```

**Representación de fuentes:**
Utilice fuentes compatibles (Noto Sans, Roboto, etc.) o inyecte fuentes personalizadas:
```html
<link href="https://fonts.googleapis.com/css2?family=Poppins" rel="stylesheet">
```

## Métodos clave

### Titiritero
- `puppeteer.launch(binding)`- Iniciar navegador
- `puppeteer.connect(binding, sessionId)`- Reconectar
- `puppeteer.sessions(binding)`- Lista de sesiones
- `browser.newPage()`- Crear página
- `browser.disconnect()`- Desconectar (mantener con vida)
- `browser.close()`- Cerrar (terminar)
- `page.goto(url, options)`- Navegar
- `page.screenshot(options)`- Captura
- `page.pdf(options)`- Generar PDF
- `page.content()`- Obtener HTML
- `page.evaluate(fn)`- Ejecutar JS

## Recursos

- Documentos: https://developers.cloudflare.com/browser-rendering/
- Titiritero: https://pptr.dev/
- Ejemplos: https://developers.cloudflare.com/workers/examples/
