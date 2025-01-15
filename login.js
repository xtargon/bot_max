const fs = require('fs');
const csv = require('csv-parser');
const puppeteer = require('puppeteer-extra');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;  

const resultadosSuscripciones = [];
var passwordDefault = "-*17654$k{)(^&3";
const delay = (time) => {
    return new Promise(function(resolve) {
        setTimeout(resolve, time);
    });
};

async function guardarResultados(cuenta, nuevaContraseña, estadoSuscripcion) {
    console.log('Guardando resultados para la cuenta:', cuenta.email, nuevaContraseña, estadoSuscripcion);
    const csvWriter = createCsvWriter({
        path: 'accountStatus.csv',
        header: [
            {id: 'email', title: 'EMAIL'},
            {id: 'passwordAntigua', title: 'PASSWORD_ANTIGUA'},
            {id: 'passwordNueva', title: 'PASSWORD_NUEVA'},
            {id: 'suscripcion', title: 'SUSCRIPCION'},
            {id: 'fechaActualizacion', title: 'FECHA_ACTUALIZACION'}
        ],
        append: true // Esto permite añadir nuevos registros sin sobrescribir
    });

    const registro = [{
        email: cuenta.email,
        passwordAntigua: cuenta.password,
        passwordNueva: nuevaContraseña,
        suscripcion: estadoSuscripcion,
        fechaActualizacion: new Date().toISOString()
    }];

    try {
        await csvWriter.writeRecords(registro);
        console.log('Datos guardados exitosamente en accountStatus.csv');
    } catch (error) {
        console.error('Error al guardar en CSV:', error);
    }
}

async function processAccount(account) {
    console.log(account.email);
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
      defaultViewport: null, // Usa el viewport completo del navegador

    });
    const page = await browser.newPage();
    // Configurar un timeout global para las operaciones
    page.setDefaultTimeout(0); // 60 segundos
  page.setDefaultNavigationTimeout(0);

    try {
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
        );
        // Navegar a la página de login
        await page.goto('https://auth.max.com/login');
        
        // Esperar a que el botón de aceptar cookies sea visible y hacer clic
        await page.waitForSelector('[aria-label="Accept All Cookies"]', { visible: true });
        await page.click('[aria-label="Accept All Cookies"]');

        // Esperar a que el elemento esté presente en el DOM
        await page.waitForFunction(() => {
            const root = document.querySelector("#layer-root-app-content > div.StyledPageContainer-Beam-Web-User__sc-6hfijb-0.bytlSk > div > main > div.StyledPageContentWrapper-Beam-Web-User__sc-6hfijb-3.ZFSGv > gi-login");
            if (!root) return false;
            
            const loginUsername = root.shadowRoot.querySelector("gi-login-username-and-mvpd");
            if (!loginUsername) return false;
            
            const input = loginUsername.shadowRoot.querySelector("div > div > div.login-username-container > div > gi-login-username")?.shadowRoot.querySelector("#login-username-input");
            return !!input;
        });
        // Escribir en el input usando evaluateHandle para acceder al Shadow DOM
        await page.evaluateHandle((mail) => {
            const root = document.querySelector("#layer-root-app-content > div.StyledPageContainer-Beam-Web-User__sc-6hfijb-0.bytlSk > div > main > div.StyledPageContentWrapper-Beam-Web-User__sc-6hfijb-3.ZFSGv > gi-login");
            const loginUsername = root.shadowRoot.querySelector("gi-login-username-and-mvpd");
            const input = loginUsername.shadowRoot.querySelector("div > div > div.login-username-container > div > gi-login-username").shadowRoot.querySelector("#login-username-input");
            input.value = mail; // Aquí puedes poner el email que desees
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }, account.email);

        await delay(2000); // Esperar un momento después de escribir
        // Esperar a que el elemento de contraseña esté presente en el DOM
        await page.waitForFunction(() => {
            const root = document.querySelector("#layer-root-app-content > div.StyledPageContainer-Beam-Web-User__sc-6hfijb-0.bytlSk > div > main > div.StyledPageContentWrapper-Beam-Web-User__sc-6hfijb-3.ZFSGv > gi-login");
            if (!root) return false;
            
            const loginUsername = root.shadowRoot.querySelector("gi-login-username-and-mvpd");
            if (!loginUsername) return false;
            
            const input = loginUsername.shadowRoot.querySelector("div > div > div.login-username-container > div > gi-login-username")?.shadowRoot.querySelector("#login-password-input");
            return !!input;
        });

        // Escribir la contraseña usando evaluateHandle para acceder al Shadow DOM
        await page.evaluateHandle((password) => {
            const root = document.querySelector("#layer-root-app-content > div.StyledPageContainer-Beam-Web-User__sc-6hfijb-0.bytlSk > div > main > div.StyledPageContentWrapper-Beam-Web-User__sc-6hfijb-3.ZFSGv > gi-login");
            const loginUsername = root.shadowRoot.querySelector("gi-login-username-and-mvpd");
            const input = loginUsername.shadowRoot.querySelector("div > div > div.login-username-container > div > gi-login-username").shadowRoot.querySelector("#login-password-input");
            input.value = password; // Aquí puedes poner la contraseña que desees
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }, account.password);


        // Esperar a que el botón de inicio de sesión esté presente y los campos estén llenos
        // Función para detectar campos llenos y hacer click en el botón
        const detectarCamposYClickBoton = async () => {
            const botonSignIn = await page.evaluateHandle(() => {
                const root = document.querySelector("#layer-root-app-content > div.StyledPageContainer-Beam-Web-User__sc-6hfijb-0.bytlSk > div > main > div.StyledPageContentWrapper-Beam-Web-User__sc-6hfijb-3.ZFSGv > gi-login");
                const loginUsername = root.shadowRoot.querySelector("gi-login-username-and-mvpd");
                const boton = loginUsername.shadowRoot
                    .querySelector("div > div > div > gi-login-username")
                    .shadowRoot
                    .querySelector('[data-testid="gisdk.gi-login-username.signIn_button"]');
                // Verificar que los campos estén llenos
                const emailInput = loginUsername.shadowRoot
                    .querySelector("div > div > div.login-username-container > div > gi-login-username")
                    .shadowRoot
                    .querySelector("#login-username-input");
                    
                const passwordInput = loginUsername.shadowRoot
                    .querySelector("div > div > div.login-username-container > div > gi-login-username")
                    .shadowRoot
                    .querySelector("#login-password-input");
                
                if (emailInput.value && passwordInput.value) {
                    return boton;
                }
                return null;
            });

            if (botonSignIn) {
                console.log("Campos detectados, haciendo click en el botón de inicio de sesión");
                await botonSignIn.click();
            } else {
                console.log("Los campos no están completos");
            }
        };

        await detectarCamposYClickBoton();
        const isVisible = await page.evaluate(() => {
            const root = document.querySelector("#layer-root-app-content > div.StyledPageContainer-Beam-Web-User__sc-6hfijb-0.bytlSk > div > main > div.StyledPageContentWrapper-Beam-Web-User__sc-6hfijb-3.ZFSGv > gi-login");
            if (!root) return false;
    
            const loginUsername = root.shadowRoot.querySelector("gi-login-username-and-mvpd");
            if (!loginUsername) return false;
    
            const alert = loginUsername.shadowRoot
                ?.querySelector("div > div > div > gi-login-username")
                ?.shadowRoot
                ?.querySelector('gi-track-analytics-events')
                ?.querySelector('div > gi-form > form > div');
    
            if (!alert) return false;
            console.log(alert);
            const styles = window.getComputedStyle(alert);
            console.log(styles);
            return styles.display !== 'none' && styles.visibility !== 'hidden' && parseFloat(styles.opacity) > 0;
        });
    
        console.log("¿El elemento es visible?", isVisible);
    

        
    // Detectar redirección automática
    try {
        const redirectResult = await Promise.race([
            page.waitForNavigation({ timeout: 60000 }),
            new Promise(resolve => setTimeout(() => resolve('timeout'), 60000))
        ]);
        if (redirectResult === 'timeout') {
            console.log('Password incorrect - La redirección excedió el tiempo límite de 60000ms');
        } else {
            console.log('Se detectó redirección automática a:', page.url());
            await page.goto('https://auth.max.com/subscription');
        }


        // Verificar existencia del elemento en el DOM
        await delay(15000)
        const elementoSuscripcion = await page.evaluate(() => {
            const seccionSuscripcion = document.querySelector('[data-testid="subscription_section_title"]');
            if (seccionSuscripcion) {
                const tituloH2 = seccionSuscripcion.querySelector('h2');
                if (tituloH2) {
                    return tituloH2.textContent.trim();
                }
            }
            return null;
        });
        
        if (elementoSuscripcion) {
            console.log('Se encontró el título de suscripción -> -> ' + elementoSuscripcion);
            // Almacena el resultado en el array global junto con el email
            resultadosSuscripciones.push({
                email: account.email,
                suscripcion: elementoSuscripcion
            });
        } else {
            console.log('No se encontró el título de suscripción');
            resultadosSuscripciones.push({
                email: account.email,
                suscripcion: 'Sin suscripción'
            });
        }
                

        console.log('Resultados de suscripciones:', resultadosSuscripciones);
        await page.goto('https://auth.max.com/account/edit/password');

        // Paso 1: Accede al primer nivel de shadow-root (gi-update-password)
        const updatePasswordHost = await page.waitForSelector(
            '#layer-root-app-content > div.StyledPageContainer-Beam-Web-User__sc-6hfijb-0.bytlSk > div > main > div.StyledPageContentWrapper-Beam-Web-User__sc-6hfijb-3.jtZrXE > div > gi-update-password',
            { timeout: 60000 } // Tiempo de espera para garantizar que el selector cargue
        );

        if (!updatePasswordHost) throw new Error('No se encontró el elemento gi-update-password');
        console.log('Acceso al primer nivel (gi-update-password) exitoso.');

        const updatePasswordShadow = await page.evaluateHandle(el => el.shadowRoot, updatePasswordHost);

        // Paso 2: Accede al siguiente nivel de shadow-root (gi-track-analytics-events)
        const trackAnalyticsHost1 = await updatePasswordShadow.evaluateHandle(root =>
            root.querySelector('gi-track-analytics-events')
        );

        if (!trackAnalyticsHost1) throw new Error('No se encontró el elemento gi-track-analytics-events en el segundo nivel');
        console.log('Acceso al segundo nivel (gi-track-analytics-events) exitoso.');

        const trackAnalyticsShadow1 = await trackAnalyticsHost1.evaluateHandle(el => el.shadowRoot);

        // Paso 3: Accede al siguiente nivel de shadow-root
        const trackAnalyticsHost2 = await trackAnalyticsShadow1.evaluateHandle(root =>
            root.querySelector('gi-track-analytics-events > div > gi-track-analytics-events > div > gi-update-password-edit > div > gi-form > div > form > .input-group-container > gi-password-input > gi-form-input > div > #change-password-currentPassword-input')
        );

        if (!trackAnalyticsHost2) throw new Error('No se encontró el elemento gi-track-analytics-events en el tercer nivel');
        console.log('Acceso al tercer nivel (gi-track-analytics-events) exitoso.');

    try {
    // Verificamos el primer shadow root
        const resultado = await page.evaluate(() => {
        const root = document.querySelector('gi-update-password');
        if (!root) {
            console.log('No se encontró gi-update-password');
            return null;
        }

        const shadowRoot = root.shadowRoot;
        if (!shadowRoot) {
            console.log('No se encontró shadow root en gi-update-password');
            return null;
        }

        // Imprimimos la estructura del DOM shadow
        console.log('Estructura del shadow DOM:', {
            children: Array.from(shadowRoot.children).map(child => ({
                tagName: child.tagName,
                className: child.className,
                id: child.id
            }))
        });

        // Intentamos encontrar el input de contraseña
        const input = shadowRoot.querySelector('input[type="password"]');
        if (input) {
            
            return {
                encontrado: true,
                tipo: input.type,
                id: input.id,
                name: input.name
            };
        }

        return {
            encontrado: false,
            estructura: shadowRoot.innerHTML
        };
    });

    console.log('Resultado de la búsqueda:', resultado);

    } catch (error) {
        console.error('Error al buscar el elemento:', error);
    }

    try {
    // Escribir en el input de contraseña usando evaluateHandle
    await page.evaluate((password, newPassword ) => {

        const root = document.querySelector('gi-update-password');
        const shadowRoot = root.shadowRoot;
        const input = shadowRoot.querySelector('input[type="password"]');
        const inputNewPassword = root.shadowRoot.querySelector('input[name="password"]');
        
        if (input) {
            // Establecer el valor
            input.focus();
            input.select();
            inputNewPassword.focus(); 
            inputNewPassword.select();

            input.value = password;
            inputNewPassword.value = newPassword;

            // Disparar eventos para simular la escritura real
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            inputNewPassword.dispatchEvent(new Event('input', { bubbles: true }));
            inputNewPassword.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('Valor establecido correctamente:', input.value);

            if (inputNewPassword.value) {
                const btnSave = shadowRoot.querySelector('button[type="submit"]');
                if (btnSave) {
                    console.log('Botón de guardar encontrado');
                    btnSave.click();
                }else{
                    console.error('No se pudo encontrar el botón de guardar');
                }
            }else{
                console.error('El campo de nueva contraseña está vacío');
            }

        } else {
            console.error('No se pudo encontrar el input de contraseña');
        }
    }, account.password, passwordDefault);

    await delay(2000); // Pequeña pausa para asegurar que el valor se establezca
    // Obtener el estado de suscripción del array global
    const suscripcionInfo = resultadosSuscripciones.find(r => r.email === account.email);
    const estadoSuscripcion = suscripcionInfo ? suscripcionInfo.suscripcion : 'No disponible';

    // Guardar los resultados
    await guardarResultados(account, passwordDefault, estadoSuscripcion);

    // Verificar que el valor se estableció correctamente
    /*const valorEstablecido = await page.evaluate(() => {
        const root = document.querySelector('gi-update-password');
        const input = root.shadowRoot.querySelector('input[type="password"]');
        return input ? input.value : null;
    });

    console.log('Verificación del valor establecido:', valorEstablecido);*/

    } catch (error) {
        console.error('Error al establecer la contraseña:', error);
    }
    console.log('Texto escrito exitosamente en el campo Current Password.');
    await new Promise((resolve) => setTimeout(resolve, 20000));

    } catch (error) {
        console.log('Error al detectar redirección:', error.message);
    }

    } catch (error) {
        console.error(`Error processing account  ppp:`, error);
    } finally {
        console.log("Cuenta procesada")
        browser.close();
    }
};

async function processCSV(filePath) {
    return new Promise((resolve, reject) => {
        const rows = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                rows.push(row);
            })
            .on('end', async () => {
                console.log('Archivo CSV leído. Procesando filas...');

                // Procesa cada fila secuencialmente
                for (const row of rows) {
                    await processAccount(row);
                    console.log(row.email);
                }

                console.log('Todas las filas procesadas.');
                resolve();
            })
            .on('error', (error) => {
                console.error('Error al leer el archivo CSV:', error);
                reject(error);
            });
    });
}

// Ejecuta el procesamiento
processCSV('testAccount.csv')
    .then(() => console.log('Procesamiento completo.'))
    .catch((error) => console.error('Error durante el procesamiento:', error));












