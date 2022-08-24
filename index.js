// Requires all the Modules needed
// const puppeteer = require('puppeteer');
const Imap = require('imap'), inspect = require('util').inspect;
const { Webhook, MessageBuilder } = require('webhook-discord');
const csvWriter = require('csv-write-stream');
const puppeteer = require('puppeteer-extra');
const io = require('console-read-write');
const randomInt = require('random-int');
const date = require('date-and-time');
const delay = require('delay');
const chalk = require("chalk");
const fs = require('fs');


var successFile = `${__dirname}/successAccounts.csv`;
var accountFile = `${__dirname}/accounts.csv`;
var proxyFile = `${__dirname}/proxys.txt`;
// If CSV file does not exist, create it and add the headers
if (!fs.existsSync(successFile)) {
  fs.writeFileSync('successAccounts.csv', `Email,newPassword\n`);
}
if (!fs.existsSync(accountFile)) {
  fs.writeFileSync('Accounts.csv', `Email,newPassword\n`);
}
if (!fs.existsSync(proxyFile)) {
  fs.writeFileSync('Accounts.csv', `Email,newPassword\n`);
}

// var fNames = [];
// var lNames = [];
var emails = [];
var passwords = [];
var gotAccountInfo = false;
var receivedEmails = []
var initialRun = true;

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function writeToLogs(tn, string) {
  if (!tn && !string) fs.appendFileSync('logs.txt', `\n`)
  else fs.appendFileSync('logs.txt', `[${date.format(new Date(), 'MM/DD/YYYY HH:mm:ss')}] [Task ${tn}] ${string} \n`)
}

function log(tn, string) {
  console.log(chalk.yellow.bold(`[${date.format(new Date(), 'MM/DD/YYYY HH:mm:ss')}] [Task ${tn}] ${string}`))
  writeToLogs(tn, string)
}

function prettyPrint(tn, string) {
  console.log(chalk.cyan.bold(`[${date.format(new Date(), 'MM/DD/YYYY HH:mm:ss')}] [Task ${tn}] ${string}`))
  writeToLogs(tn, string)
}

function bad(tn, string) {
  console.log(chalk.red.bold(`[${date.format(new Date(), 'MM/DD/YYYY HH:mm:ss')}] [Task ${tn}] ${string}`))
  writeToLogs(tn, string)
}

function good(tn, string) {
  console.log(chalk.green.bold(`[${date.format(new Date(), 'MM/DD/YYYY HH:mm:ss')}] [Task ${tn}] ${string}`))
  writeToLogs(tn, string)
}

// Gets the Users info like name, catchall, captchakey, and etc
var settings = JSON.parse(fs.readFileSync(__dirname + '/settings.json'));
const authkey = settings["Key"]
var headless = settings["Headless"]
var proxy = settings["Proxy"]
var emailServerInfo = settings["imap"]

var emailServer = new Imap({
  user: emailServerInfo.email,
  password: emailServerInfo.password,
  host: emailServerInfo.host,
  port: emailServerInfo.port,
  tls: true,
  tlsOptions: {
    rejectUnauthorized: false
  },
  authTimeout: 3000
}).once('error', async function (err) {
  console.log('Source Server Error:- ', err);
});

if (headless !== true && headless !== false) {
  headless = false
}
if (proxy !== true && proxy !== false) {
  proxy = false
}

var userWebhook = "";
if (settings["DiscordWebhook"].length > 40) {
  userWebhook = new Webhook(settings["DiscordWebhook"]);
} else {
  console.log(chalk.red.bold("Error Invalid Webhook"))
}


const agents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.152 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.152 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.152 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; SM-N960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.152 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 7.0; SM-G930VC Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/58.0.3029.83 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 6.0.1; SM-G935S Build/MMB29K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/55.0.2883.91 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 6.0.1; SM-G920V Build/MMB29K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.98 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 5.1.1; SM-G928X Build/LMY47X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.83 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 6P Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.83 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 8.0.0; SM-G960F Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36"
]

async function checkingEmail(mailServer, tn) {
  if (initialRun) writeToLogs(tn, `Getting List of Current Emails`)
  if (!initialRun) writeToLogs(tn, `Checking For New Emails`) //log(tn, `Checking For New Emails`)

  mailServer.openBox('INBOX', true, async function (err, box) {
    if (err) return console.log(err.stack);

    var f = mailServer.seq.fetch('*:' + (box.messages.total - 10), { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE BODY)'], struct: true });
    f.on('message', async function (msg, messageID) {
      var prefix = '(#' + messageID + ') ';
      var from;
      var to;
      var date;
      var subject;
      var code;
      var oldEmail = false;
      var site = "";

      msg.on('body', async function (stream, info) {
        var buffer = '';
        stream.on('data', async function (chunk) {
          // console.log(info.which)
          buffer += chunk.toString('utf8');
        });

        stream.once('end', async function () {
          if (info.which == `HEADER.FIELDS (FROM TO SUBJECT DATE BODY)`) {
            // console.log(buffer)
            // if (site == "ticketmaster") {
            buffer.split('\n').forEach(line => {
              try {
                if (line.includes('From:')) {
                  // console.log(line)
                  from = line.split('<')[1].split('>')[0]
                  if (from.includes("orders@oe1.target.com")) {
                    site = "target"
                    // console.log(`Found Target Email`)
                  }
                } else if (line.includes('To:')) {
                  try {
                    to = line.split('<')[1].split('>')[0]
                  } catch (e) {
                    to = line.split('To:')[1].split('/r')[0]
                  }
                } else if (line.includes('Date')) {
                  date = line.split('Date:')[1].split('/r')[0]
                } else if (line.includes('Subject:')) {
                  // console.log(line)
                  subject = line.split('Subject:')[1].split('/r')[0]
                  if (subject.includes("updated successfully")) site = "";
                  if (site == "target") {
                    // code = subject.split("is ")[1]
                    code = subject.split("is ")[1].slice(0, -2)
                  }
                }
              } catch (e) {
                // bad(`Error`, e.stack)
                writeToLogs(e.stack)
              }
            });
            // console.log(`Site: ??? {${site}}`)
            if (site == "target") {
              // console.log(`Initial Run: ???${initialRun}`)
              for (let i = 0; i < receivedEmails.length; i++) {
                if (receivedEmails[i].id == messageID) {
                  oldEmail = true;
                  // console.log(`This is an old email`)
                }
              }
              if (!oldEmail) {
                if (initialRun) {
                  // console.log()
                  // console.log(`Initial Run (NOT SENDING DISCORD WEBHOOK)`)
                  // console.log(`Message #${messageID}`);
                  // console.log(`From: ${from}`)
                  // console.log(`To: ${to}`)
                  // console.log(`Subject: ${subject}`)
                  // console.log(`Date: ${date}`)
                  // console.log(`Code: ${code}`)
                  receivedEmails.push({
                    id: messageID,
                    from: from,
                    to: `Ignore`,
                    subject: `Ignore`,
                    date: date,
                    code: `Ignore`
                  })
                } else {
                  // console.log()
                  // console.log(`NEW EMAIL FOUND (SENDING DISCORD WEBHOOK)`)
                  // console.log(`Message #${messageID}`);
                  // console.log(`From: ${from}`)
                  // console.log(`To: ${to}`)
                  // console.log(`Subject: ${subject}`)
                  // console.log(`Date: ${date}`)
                  // console.log(`Code: ${code}`)
                  writeToLogs()
                  writeToLogs(tn, `NEW EMAIL FOUND (SENDING DISCORD WEBHOOK)`)
                  writeToLogs(tn, `Message #${messageID}`)
                  writeToLogs(tn, `From: ${from}`)
                  writeToLogs(tn, `To: ${to}`)
                  writeToLogs(tn, `Subject: ${subject.replace(/[\r\n]/gm, '')}`)
                  writeToLogs(tn, `Date: ${date.replace(/[\r\n]/gm, '')}`)
                  writeToLogs(tn, `Code: ${code.replace(/[\r\n]/gm, '')}`)
                  // writeToLogs(tn, ``)

                  writeToLogs()
                  prettyPrint(tn, `Found an Email Containing a Code`)
                  prettyPrint(tn, `Code: ${code} to ${to}`)

                  receivedEmails.push({
                    id: messageID,
                    from: from,
                    to: to,
                    subject: subject,
                    date: date,
                    code: code
                  })
  
                  const success = new MessageBuilder()
                    .setName('Rehaan Imap Watcher')
                    .setColor('#FF0000')
                    .setTitle(`Code: ${code}`)
                    .setThumbnail("https://media.discordapp.net/attachments/697695144199061504/772389436885172224/451px-Target_logo.svg.png?width=356&height=473")
                    .addField('From', from, false)
                    .addField('To', to, false)
                    .addField('MessageID', messageID, true)
                    .addField('Subject', subject, true)
                    .addField('Date', date, true)
                    .setFooter('Rehaanm03 Tools', 'https://cdn.discordapp.com/attachments/697695144199061504/701151541389819995/new_pfp4.png')
                    .setTime();
  
                  // mainWebhook.send(success)
                  if (userWebhook !== "") {
                    userWebhook.send(success);
                    // console.log(chalk.green.bold(`[Task ${tn}] Sent Webhook`))
                    writeToLogs(tn, `Sent Webhook`)

                  } else {
                    // console.log(chalk.red.bold("Invalid Webhook"))
                  }
                }
              }
            }
            // }
          }
        });
      });
    });
    f.once('error', async function (err) {
      console.log('Fetch error: ' + err.stack);
    });
    f.once('end', async function () {
      if (initialRun) writeToLogs(tn, `Done Getting List of Current Emails`)
      if (!initialRun) writeToLogs(tn, `Fetched All Emails`) // log(tn, `Fetched All Emails`)
      initialRun = false;
    });
  });
}

// This function is the main function
async function task(i) {
  const tn = randomInt(10, 9999)
  // console.log(i)
  if (gotAccountInfo == false) {
    log(tn, `Initalizing, Loading Accounts`)
    var fileContent = fs.readFileSync(__dirname+'/accounts.csv');
    // console.log(fileContent.toString())
    fileContent = fileContent.toString()
    splitAccounts = fileContent.split('\n')
    for (a = 1; a < splitAccounts.length; a++) {
      // console.log(splitAccounts[i]);
      let accountInfo = splitAccounts[a].split(",");
      // console.log(`First Name: ${accountInfo[0]}`);
      // console.log(`Last Name: ${accountInfo[1]}`);
      // console.log(`Email: ${accountInfo[2]}`);
      // console.log(`Password: ${accountInfo[3]}`);
      // fNames.push(accountInfo[0]);
      // lNames.push(accountInfo[1]);
      emails.push(accountInfo[0]);
      passwords.push(accountInfo[1].replace(/[\r\n]/gm, ''));
    }
    gotAccountInfo = true;
  }
  // console.log(fNames);
  var fileContent = fs.readFileSync(__dirname+'/accounts.csv');
  fileContent = fileContent.toString()
  splitAccounts = fileContent.split('\n')
  if (i == splitAccounts.length - 1) {
    good(`Done`, `Successfully Resetted All Accounts`)
    return
  }
  // return
  writeToLogs(tn, `Using Headless Mode: ${headless}`)
  writeToLogs(tn, `Using Proxy Mode: ${proxy}`)

  var arguments = [`--window-size=500,200`, `--user-agent=${agents[randomInt(0, agents.length - 1)]}`]
  proxyList = [];
  var fullProxy = "N/A";
  var proxyUserPass = false
  var proxyUser = ""
  var proxyPassword = ""

  if (proxy == true) {
    log(tn, `Getting Proxys`)
    rawProxyData = fs.readFileSync(__dirname + '/proxys.txt')
    var proxyListData = rawProxyData.toString()
    if (proxyListData == "") {
      bad(tn, `Proxy List Is Empty`)
      return
    }

    var proxyListObject = proxyListData.split('\r\n')
    for (let i = 0; i < proxyListObject.length; i++) {
      proxyList.push(proxyListObject[i])
    }
    var randomProxy = proxyList[randomInt(0, proxyList.length - 1)]
    var splitProxy = randomProxy.split(':')
  
    if (splitProxy[2] && splitProxy[3]) {
      proxyUserPass = true
      var proxyUser = splitProxy[2]
      var proxyPassword = splitProxy[3]
    }

    var fullProxy = 'http://' + splitProxy[0] + ":" + splitProxy[1]
    prettyPrint(tn, `Using Proxy: ${fullProxy}`)
    
    // '--disable-features=site-per-process'
    // '--proxy-server=' + proxys[randomInt(0, 24)]
    // '--user-agent=' + agents[randomInt(0, 4)]
    // '--user-agent=' + userAgent.toString()]
    // `--window-size=${options.width},${options.height}`
    arguments = [`--window-size=500,200`, `--user-agent=${agents[randomInt(0, agents.length - 1)]}`, `--proxy-server=${fullProxy}`]

  }

  if (headless !== true && headless !== false) {
    bad(tn, `Make Sure The Headless Value in the \'settings.json\' File is Equal to true or false\nTrue means the Browser Would Show\nFalse means the Browser Won\'t Show\nI highly recommend keeping the value false`)
  } else if (proxy !== true && proxy !== false) {
    bad(tn, `Make Sure The Proxy Value in the \'settings.json\' File is Equal to true or false\nTrue Means You want to use Proxys\nFalse Means you Don\'t want to use proxys`)
  }

  // const newFirstName = fNames[i];
  // const newLastName = lNames[i];
  const finalEmail = emails[i];
  const finalPassword = passwords[i].replace(/[\r\n]/gm, '');

  if (finalPassword.length > 20 || finalPassword.length < 8) {
    bad(tn, `INVALID PASSWORD, PASSWORD MUST BE 8-20 CHARACTERS, YOUR PASSWORD IS ${finalPassword.length} CHARACTERS`)
    await delay(300);
    await task(i + 1);
    return
  }

  const browser = await puppeteer.launch({
    args: arguments,
    headless: headless
  });
  const page = await browser.newPage();

  if (proxyUserPass == true) {
    prettyPrint(tn, `Detected User Pass Proxy`)
    await page.authenticate({
      username: proxyUser,
      password: proxyPassword
    })
  }

  // await page.setUserAgent(agents[randomInt(0, 4)])
  // console.log(browser.userAgent());

  // Creates a new page and goes to the registration page
  await page.goto('https://www.target.com/circle?ref=sr_shorturl_circle', {
    timeout: 0
  });

  console.log()
  log(tn, `Heading To Sign Up Page`)
  prettyPrint(tn, `Email: ${finalEmail}`)
  prettyPrint(tn, `New Password: ${finalPassword}`)


  // await page.waitFor(2500)
  try {
    await page.waitForXPath("//button[contains(text(), 'Sign in')]")
  } catch (e) {
    bad(tn, `Sign In Button Not Found. Proxy May Be Bad - Report to Rehaanm03#8677 if Problem is Reoccurring`)
    task(i)
    return
  }
  // .then(() => console.log('Create Button is there'))
  // const createaccountbutton = await page.$x("//button[contains(text(), 'Sign in')]")
  // await createaccountbutton[0].click()
  const signInButton = await page.$x("//button[contains(text(), 'Sign in')]");

  if (signInButton.length > 0) {
    await signInButton[0].click();
  } else {
    bad(tn, `Create Button Not Found`)
    return
  }

  // await page.waitForTimeout(200)
  await page.waitForSelector('#recoveryPassword', {
    timeout: 0
  })
  // await page.waitForTimeout(200)
  await page.click('#recoveryPassword')
  // await page.waitForTimeout(200)
  await page.waitForSelector('#username', {timeout: 0})
  // await page.waitForTimeout(200)
  log(tn, `Typing In Email`)
  await page.type('#username', finalEmail, {delay: 30})
  await page.click('#continue')
  // await page.waitForTimeout(200)
  await page.waitForSelector('#continue', {timeout: 0})
  await page.click('#continue')
  await page.waitForTimeout(2500)
  var blocked = 0

  async function err() {
    bad(tn, `Caught by Anti-Bot`)
    blocked = blocked + 1
    var time = randomInt(5, 15)
    if (blocked > 1) {
      var time = randomInt(16, 26)
    }
    var newtime = time * 60000
    log(tn, `Waiting for ${time} Minute(s)\nDO NOT RESTART BOT IT WILL NOT HELP WITH GETTING CAUGHT BY THE ANTI-BOT`)

    await page.waitForTimeout(newtime)
    await page.waitForSelector('#continue', { timeout: 0 })
    await page.click('#continue')
    await page.waitForTimeout(2500)
    let errorButton = await page.$x("/html/body/div[1]/div[2]/div/div[1]/div/form/div[1]/div")

    if (errorButton.length < 1) {
      good(tn, `Unblocked By Anti-Bot!`)
    } else if (errorButton.length == 0) {
      await err()
    } else {
      bad(tn, `Error`)
    }
  }

  var errorButton = await page.$x("/html/body/div[1]/div[2]/div/div[1]/div/form/div[1]/div")
  if (errorButton.length > 0) {
    var xpathTextContent = await errorButton[0].getProperty('textContent'), text = await xpathTextContent.jsonValue();
    await err()
  }

  try {
    await page.waitForSelector('#__next > div > div > div > div > div > div > div > form > input')
  } catch (e) {
    bad(tn, e.stack)
    await page.screenshot({path: 'ErrorScreenshot.png'});
    return
  }
  async function getCode() {
    gettingCode = true
    while (gettingCode) {
      if (emailServerInfo.enable) {
        for (var i = 0; i < receivedEmails.length; i++) {
          if (finalEmail.toLowerCase() == receivedEmails[i]["to"].toLowerCase()) {
            return receivedEmails[i].code
          }
        }
        await checkingEmail(emailServer, tn)
        await timeout(800)
        for (var i = 0; i < receivedEmails.length; i++) {
          if (finalEmail.toLowerCase() == receivedEmails[i]["to"].toLowerCase()) {
            return receivedEmails[i].code
          }
        }
      } else {
        var code = await io.ask(chalk.yellow.bold(`[Task ${tn}] What Is The Code Send To Email`))
        writeToLogs(tn, `What Is The Code Send To Email`)
        writeToLogs(tn, `Code That Was Entered Manually: [${code}]`)
        if (code.length < 6) {
          bad(tn, `Invalid Code, Try Again`)

          // var code = await io.ask(chalk.yellow.bold(`What Is The Code Send To Email`))
        } else if (code.length == 6) {
          gettingCode = false
          return code
        }
      }
      await timeout(1100)
    }
  }
  if (emailServerInfo.enable) log(tn, `Getting Code Automatically`)
  var code = await getCode()
  // var codeManual = await io.ask(chalk.yellow.bold(`[Task ${tn}] What Is The Code Send To Email`))
  // console.log(`Is it the same string: ${code == codeManual}`)
  await page.type('#__next > div > div > div > div > div > div > div > form > input', code, {delay: 30})
  // await page.waitFor(200)
  await page.click('#verify')
  await page.waitForTimeout(1800)
  async function checkingForCodeError() {
    var errorButton = await page.$x("/html/body/div[1]/div[2]/div/div[1]/div/div[2]/div/div/div[1]/div")
    if (errorButton.length > 0) {
      var xpathTextContent = await errorButton[0].getProperty('innerText'), text = await xpathTextContent.jsonValue();
      // console.log(text)

      if (text.endsWith("That code is invalid." || text == "That code is invalid." || text.includes("That code is invalid"))) {
        bad(tn, `Code Is Invalid!`)
        var code = await getCode()
        const input = await page.$('#__next > div > div > div > div > div > div > div > form > input');
        await input.click({ clickCount: 3 })
        await page.type('#__next > div > div > div > div > div > div > div > form > input', code, {delay: 30})
        // await page.waitFor(200)
        await page.click('#verify')
        await page.waitForTimeout(2500)
        await checkingForCodeError()
  
      } else if (text.endsWith("Sorry, there have been too many unsuccessful verification attempts. Please try again after 5 minutes.") || text == "Sorry, there have been too many unsuccessful verification attempts. Please try again after 5 minutes." || text.includes("Sorry, there have been too many unsuccessful verification attempts. Please try again after 5 minutes")) {
        bad(tn, `Too Many Unsuccessfull Attempts, Waiting 5 Minutes, DO NOT CLOSE!`)
        await delay(300000);
        var code = await getCode()
        const input = await page.$('#__next > div > div > div > div > div > div > div > form > input');
        await input.click({ clickCount: 3 })
        await page.type('#__next > div > div > div > div > div > div > div > form > input', code, {delay: 30})
        // await page.waitFor(200)
        await page.click('#verify')
        await page.waitForTimeout(2500)
        await checkingForCodeError()
      } else if (text.endsWith("That code has expired." || text == "That code has expired." || text.includes("That code has expired"))) {
        bad(tn, `Code Has Expired, Restarting`)
        writeToLogs()
        await browser.close();
        await delay(200);
        await task(i);
        return
      } else if (text == "Sorry, something went wrong. Please try again." || text.includes("Sorry, something went wrong. Please try again.") || text.endsWith("Sorry, something went wrong. Please try again.")) {
        var time = randomInt(5, 15)
        bad(tn, `Caught By Anti-Bot`)
        log(tn, `Waiting for ${time} Minute(s)\nDO NOT RESTART BOT IT WILL NOT HELP WITH GETTING CAUGHT BY THE ANTI-BOT`)

        await page.waitForTimeout(time)
      } else {
        console.log(text)
      }
    }
  }
  await checkingForCodeError()
  await page.waitForSelector('#password', {timeout: 0})
  good(tn, `Code Was Correct`)
  log(tn, `Typing In Password: ${finalPassword}`)
  await page.type('#password', finalPassword, {delay: 30})
  await page.click('#submit')
  await page.waitForTimeout(5500)
  // await page.waitForSelector('body')
  async function checkingIfSuccessful() {
    checking = true
    while (checking) {
      // https://www.target.com/login?client_id=ecom-web-1.0.0&ui_namespace=ui-default&back_button_action=browser&keep_me_signed_in=true&kmsi_default=false&actions=create_session_signin
      if (await page.url() == "https://www.target.com/circle?ref=sr_shorturl_circle" || await page.url() == "https://www.target.com/circle/dashboard" || await page.url().startsWith(`https://www.target.com/circle`)) {
        checking = false
        good(tn, `Account Successfully Resetted`)

        const emailPass = `${finalEmail}:${finalPassword}\n`;
        fs.appendFileSync('emailPass.txt', emailPass);
        fs.appendFileSync('successAccounts.csv', `${finalEmail},${finalPassword}\n`);
        good(tn, `Added Account to successAccount.csv`)

        const success = new MessageBuilder()
          .setName('Rehaan Account Unlocker')
          .setColor('#FF0000')
          .setTitle('Account Successfully Resetted')
          .setThumbnail("https://media.discordapp.net/attachments/697695144199061504/772389436885172224/451px-Target_logo.svg.png?width=356&height=473")
          .addField('Site', 'Target', true)
          .addField('Headless', headless, true)
          .addField('Proxy', `||${fullProxy}||`, true)
          .addField('Email', finalEmail, true)
          .addField('Password', `||${finalPassword}||`, true)
          .addField('Task:', tn, true)
          // .addField('Blocked', blocked + " Time(s)", true)
          .setFooter('Powered By Rehaanm03#8677', 'https://cdn.discordapp.com/attachments/697695144199061504/701151541389819995/new_pfp4.png')
          .setTime();
    
        if (userWebhook !== "") {
          userWebhook.send(success);
          good(tn, `Sent Webhook!`)
        } else {
          bad(tn, `Invalid Webhook`)
        }
    
        writeToLogs()
        await browser.close();
        await delay(200);
        await task(i + 1); 
      } else if (await page.url().includes(`actions=create_session_signin`) || await page.url() == `https://www.target.com/login?client_id=ecom-web-1.0.0&ui_namespace=ui-default&back_button_action=browser&keep_me_signed_in=true&kmsi_default=false&actions=create_session_signin` || await page.url() == `https://www.target.com/login?client_id=ecom-web-1.0.0&ui_namespace=ui-default&back_button_action=browser&keep_me_signed_in=true&kmsi_default=true&actions=create_session_signin`) {
        writeToLogs(tn, `URL: ${await page.url()}`)
        var errorButton = await page.$x("/html/body/div[1]/div[2]/div/div[1]/div/div[2]/div/div/div/div")
        if (errorButton.length > 0) {
          // console.log(errorButton);
          // var xpathData = await page.$x(`xpathSelector`); 
          var xpathTextContent = await errorButton[0].getProperty('textContent'), text = await xpathTextContent.jsonValue();
          // console.log(text)
          if (text == "Your new password can't be the same as the old one.") {
            bad(tn, `New Password Can't Be The Same As The Old One!`)
            writeToLogs()
            await browser.close();
            await delay(200);
            await task(i + 1);
            return
          } else {
            console.log(text)
            bad(tn, `Error Has Occured Please Inform Rehaanm03#8677`)
          }
        }
        writeToLogs()
        await browser.close();
        await delay(200);
        await task(i + 1);

      } else {
        writeToLogs(tn, `URL: ${await page.url()}`)

        var errorButton = await page.$x("/html/body/div[1]/div[2]/div/div[1]/div/div[2]/div/div/div/div")
        if (errorButton.length > 0) {
          // console.log(errorButton);
          // var xpathData = await page.$x(`xpathSelector`); 
          var xpathTextContent = await errorButton[0].getProperty('textContent'), text = await xpathTextContent.jsonValue();
          // console.log(text)
          if (text == "Your new password can't be the same as the old one.") {
            bad(tn, `New Password Can't Be The Same As The Old One!`)
            writeToLogs()
            await browser.close();
            await delay(200);
            await task(i + 1);
            return
          } else {
            console.log(text)
          }
        }
      }
      await delay(800)
    }
  }
  checkingIfSuccessful()
  return
  // #__next > div > div > div > div > div > div > div > form > input
};


writeToLogs()
good(`Started`, `Welcome to the Rehaanm03 Target Account Unlocker`)
if (emailServerInfo.enable) {
  emailServer.once('ready', async function () {
    emailServer.openBox('INBOX', true, async function (err, box) {
      if (err) throw err;
      good(`Started`, `Ready To Listen For Emails`)
      await checkingEmail(emailServer, `Initial Run`)
      await task(0)

    });
  })

  emailServer.connect();

} else {
  task(0)
}