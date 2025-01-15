const puppeteer = require('puppeteer');
const fs = require('fs');
const csv = require('csv-parser');

async function processAccounts() {
    const accounts = [];
    
    // Leer cuentas desde un archivo CSV
    fs.createReadStream('accounts.csv')
        .pipe(csv())
        .on('data', (row) => {
            accounts.push(row);
        })
        .on('end', async () => {
            for (const account of accounts) {
                await handleAccount(account);
               // console.log(`Processed account ${account.email}`);
            }
        });
}

async function handleAccount(account) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Navegar a la página de login
        await page.goto('https://auth.max.com/login');
        
        // Esperar a que el botón de aceptar cookies sea visible y hacer clic
        await page.waitForSelector('[aria-label="Accept All Cookies"]', { visible: true });
        await page.click('[aria-label="Accept All Cookies"]');
        
        // Esperar a que los campos de email y password sean visibles
        const usernameSelector = '#layer-root-app-content > div > div > main > div > gi-login';
        const passwordSelector = '#layer-root-app-content > div > div > main > div > gi-login';
        
        const usernameHandle = await page.evaluateHandle((selector) => {
            return document.querySelector(selector).shadowRoot
                .querySelector("gi-login-username-and-mvpd").shadowRoot
                .querySelector("div > div > div > gi-login-username").shadowRoot
                .querySelector("#login-username-input");
        }, usernameSelector);

        const passwordHandle = await page.evaluateHandle((selector) => {
            return document.querySelector(selector).shadowRoot
                .querySelector("gi-login-username-and-mvpd").shadowRoot
                .querySelector("div > div > div > gi-login-username").shadowRoot
                .querySelector("#login-password-input");
        }, passwordSelector);

        await page.waitForFunction((username, password) => {
            return username && password;
        }, {}, usernameHandle, passwordHandle);

        // Ingresar credenciales
        await page.evaluate((username, email) => {
            username.value = email;
        }, usernameHandle, account.email);

        await page.evaluate((password, pass) => {
            password.value = pass;
        }, passwordHandle, account.password);
        console.log(`Processed account ${account}`);
        // Esperar a que el botón de login sea visible y hacer clic
        await page.waitForSelector('[data-testid="gisdk.gi-login-username.signIn_button"]', { visible: true });
        await page.click('[data-testid="gisdk.gi-login-username.signIn_button"]');
        
        // Esperar a que la página cargue
        await page.waitForNavigation();
        
        // Verificar tipo de suscripción
        const subscriptionType = await page.evaluate(() => {
            // Suponiendo que hay un elemento que muestra el tipo de suscripción
            return document.querySelector('#subscriptionType').innerText;
        });
        
        // Navegar a la página de configuración de cuenta
        await page.goto('https://max.com/account/settings');
        
        // Esperar a que el campo de nueva contraseña sea visible
        await page.waitForSelector('#newPassword', { visible: true });
        
        // Cambiar contraseña
        const newPassword = 'newSecurePassword123';
        await page.type('#newPassword', newPassword);
        
        // Esperar a que el botón de cambiar contraseña sea visible y hacer clic
        await page.waitForSelector('#changePasswordButton', { visible: true });
        await page.click('#changePasswordButton');
        
        // Guardar estado en un archivo CSV
        const accountStatus = {
            email: account.email,
            subscriptionType: subscriptionType,
            newPassword: newPassword,
            status: 'Success'
        };
        saveAccountStatus(accountStatus);
        
    } catch (error) {
        console.error(`Error processing account ${account.email}:`, error);
    } finally {
        await browser.close();
    }
}

function saveAccountStatus(accountStatus) {
    const csvLine = `${accountStatus.email},${accountStatus.subscriptionType},${accountStatus.newPassword},${accountStatus.status}\n`;
    fs.appendFileSync('account_status.csv', csvLine);
}

processAccounts();
