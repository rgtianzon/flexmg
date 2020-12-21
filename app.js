const express = require("express");
const app = express();
const path = require("path");
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const methodOverride = require('method-override');
const bcrypt = require('bcrypt');
const moment = require('moment');
const m = moment();
const momenttz = require('moment-timezone');
const flash = require('connect-flash');
const Slackbot = require('slackbots');
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');

// const bot = new Slackbot({
//     token: 'xoxb-1534814714324-1567192858695-a2vs4BX0aHobeUrDuNbUEcZH',
//     name: 'FlexMG - Update'
// })

const Roster = require('./models/roster');
const State = require('./models/stateFlexMG');
const AgentState = require('./models/agentState');
const Campaign = require('./models/campFlexMG');
const AgentCamp = require('./models/agentWorkingCamp');
const FlexEOD = require('./models/flexmgeod');

const sessionOptions = { 
    secret: 'notagoodsecret', 
    resave: false, 
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 120,
        maxAge: 1000 * 60 * 120
    }
}

const dbUrl = process.env.DB_URL || 'mongodb+srv://admin:TriskelioN12@cluster0.o9j4k.mongodb.net/signals?retryWrites=true&w=majority';
mongoose.connect(dbUrl, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false})
    .then(() => {
        console.log('connection open!');
    })
    .catch(() => {
    console.log('error');
    })

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

app.use(session(sessionOptions));
app.use(flash());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    if(req.method==='OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH')
        return res.status(200).json({});
    }
    next();
})
// ---------------------------------------------------------------------

// homepage
app.get('/', async (req, res) => {
    const user = await Roster.findOne({userName: req.session.user_id});
    if (user) {
        if (user.isActive) {
            if (user.isAdmin) {
                res.redirect('/adminhome');
            } else {
                res.redirect('/agenthome');
            }
        } else {
            res.render('home');
        }
    } else {
        res.render('home');
    }
})
// login
app.post('/login', async (req, res) => {
    const { userName, password } = req.body
    const user = await Roster.find({ userName: userName });
    actUser = user[0]
    const validpw = await bcrypt.compare(password, actUser.password)
    if(validpw){
        if(actUser.isSuperAdmin || actUser.isActive && actUser.Account == "FlexMG"){
            req.session.user_id = actUser.userName;
            if(actUser.isAdmin){
                res.redirect('/adminhome')
            } else {
                res.redirect('/agenthome')
            }
        } else {
            res.render('home')
        }
    } else {
        res.render('home')
    }
})

app.get('/agenthome', async (req, res) => {
    const user = await Roster.findOne({userName: req.session.user_id});
    const state = await State.find({});
    const Camp = await Campaign.find({}).sort({created_at: -1});
    const ongoingState = await AgentState.find({userName: req.session.user_id, onGoing: true}).sort({created_at: -1});
    const onCamp = await AgentCamp.find({userName: req.session.user_id, onGoing: true}).sort({created_at: -1});
    // state history
    const statehis = await AgentState.find({userName: req.session.user_id, onGoing: false}).sort({created_at: -1});
    const wasCamp = await AgentCamp.find({userName: req.session.user_id, onGoing: false}).sort({created_at: -1});
    if(user.isActive && user.Account == "FlexMG"){
        if(user.isAdmin){
            res.redirect('/adminhome')
        } else {
            res.render('agenthome', {user, state, Camp, ongoingState, onCamp, statehis, wasCamp})
        }
    } else {
        res.redirect('/');
    }
})

//agent adding state
app.post('/onstate', async (req, res) => {
    const user = await Roster.findOne({userName: req.session.user_id});
    const { stateName } = req.body
    const stateType = await State.findOne({ stateName: stateName});
    let random = Math.floor(Math.random()*99999999) + 100001
    const agentStateid = await AgentState.findOne({stateID: random});
    while(agentStateid !== null){
        random = Math.floor(Math.random()*99999999) + 100001
    }
    const fi = stateName.replace(/\s/g, '');
    const stateu = fi + random
    const fn = user.firstName + " " + user.lastName
    let NewYork = momenttz.tz(new Date(), "America/New_York");
    const agentState = new AgentState({
        stateID: random,
        userName: user.userName,
        fullName: fn,
        stateName: stateName,
        stateU: stateu,
        stateType: stateType.stateType,
        startDate: NewYork.format('L LTS'),
        onGoing: true
    })
    await agentState.save()
        .then(() => {
            res.redirect('/');
        })
})

// agent put route for end state

app.put('/agentstateput', async (req, res) => {
    const tid = req.body.stateID;
    const coms = req.body.comments;
    const user = await Roster.findOne({userName: req.session.user_id});
        // duration start

        const endtak = momenttz.tz(new Date(), "America/New_York");
        const endDate = endtak.format('L LTS')
        const aTask = await AgentState.findOne({stateID: tid});
        const taskStart = new Date(aTask.startDate).getTime();
        const taskEnd = new Date(endDate).getTime();
        const distance = taskEnd - taskStart;
        var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((distance % (1000 * 60)) / 1000);
        const durationTime = hours + 'h ' + minutes + 'm ' + seconds + 's'
    
        // duration end
    const filter = { stateID: tid };
    const update = { 
        onGoing: false,
        endDate,
        durationTime,
        durationHr: hours,
        durationMn: minutes,
        durationSc: seconds,
        comments: coms,
        UpdatedBy: user.userName
    };
    await AgentState.findOneAndUpdate(filter, update);
    res.redirect('/agenthome');
})

//agent working on campaign
app.post('/oncamp', async (req, res) => {
    const { CampName } = req.body
    const user = await Roster.findOne({userName: req.session.user_id});
    let random = Math.floor(Math.random()*99999999) + 100001
    const agentCampsid = await AgentCamp.findOne({workID: random});
    while (agentCampsid !== null) {
        random = Math.floor(Math.random()*99999999) + 100001
    }
    const fi = CampName.replace(/\s/g, '');
    let campU = fi + random;
    const fn = user.firstName + " " + user.lastName
    let NewYork = momenttz.tz(new Date(), "America/New_York");
    const Agentcamp = new AgentCamp({
        workID: random,
        userName: user.userName,
        fullName: fn,
        CampName: CampName,
        CampU: campU,
        startDate: NewYork.format('L LTS'),
        onGoing: true
    })
    await Agentcamp.save();
    res.redirect('/agenthome')
})

// end campaign working on

app.put('/oncamp', async (req, res) => {
    const tid = req.body.workID;
    const { leadsProspected, goodLeads, website, email, linkedin, fb, Skype, comments, workID } = req.body
    const user = await Roster.findOne({userName: req.session.user_id});
        // duration start

        const endtak = momenttz.tz(new Date(), "America/New_York");
        const endDate = endtak.format('L LTS')
        const aTask = await AgentCamp.findOne({workID: tid});
        const taskStart = new Date(aTask.startDate).getTime();
        const taskEnd = new Date(endDate).getTime();
        const distance = taskEnd - taskStart;
        var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((distance % (1000 * 60)) / 1000);
        const durationTime = hours + 'h ' + minutes + 'm ' + seconds + 's'
        
        // duration end
        
        const rstime = `${new Date(aTask.startDate).getHours()}:${new Date(aTask.startDate).getMinutes()}:${new Date(aTask.startDate).getSeconds()}`;
        const retime = `${new Date(endDate).getHours()}:${new Date(endDate).getMinutes()}:${new Date(endDate).getSeconds()}`;
        const filter = { workID: tid };
        const update = { 
            onGoing: false,
            endDate,
            Deconflicted: leadsProspected - goodLeads,
            leadsProspected,
            goodLeads,
            website,
            email,
            linkedin,
            fb,
            Skype,
            comments,
            durationTime,
            durationHr: hours,
            durationMn: minutes,
            durationSc: seconds,
            Report: `${rstime} - ${retime} | FlexMG: Leads Prospected -${leadsProspected} | Good leads -${goodLeads} | Website -${website} | Email -${email} | Linkedin -${linkedin} | FB -${fb} | Skype -${Skype}`,
            UpdatedBy: user.userName
        };
        await AgentCamp.findOneAndUpdate(filter, update);
        const reports = `${aTask.fullName} | ${rstime} - ${retime} | FlexMG: Leads Prospected -${leadsProspected} | Good leads -${goodLeads} | Website -${website} | Email -${email} | Linkedin -${linkedin} | FB -${fb} | Skype -${Skype}`;

        // const bot = new Slackbot({
        //     token: 'xoxb-1534814714324-1567192858695-a2vs4BX0aHobeUrDuNbUEcZH',
        //     name: 'FlexMG - Update'
        // })
        // bot.on('start', ()=>{
        //     bot.postMessageToChannel('flexmg-test', reports);
        // })
        res.redirect('/agenthome')
})

// agent pw reset

app.get('/agentpwreset', async (req, res) => {
    const user = await Roster.findOne({userName: req.session.user_id});
    res.render('agentpwreset', {user, msg: req.flash(), err: req.flash()});
})

app.put('/agentpwreset', async (req, res) => {
    const user = await Roster.findOne({userName: req.session.user_id});
    const uname = user.userName;
    const pw = req.body.password;
    const cpw = req.body.confirmpw;
    const hash = await bcrypt.hash(pw, 12);
    if (pw===cpw) {
        const filter = {userName: uname}
        const update = {
            password: hash,
        }
        await Roster.findOneAndUpdate(filter, update);
        req.flash('success','Password Changed')
        res.render('agentpwreset', {user, msg: req.flash('success'), err: req.flash()});
    } else if (pw!==cpw) {
        req.flash('error','Confirm Password did not match')
        res.render('agentpwreset', {user, err: req.flash('error'), msg: req.flash()});
    }
})

// add campaign
app.post('/addcamps', async (req, res) => {
    console.log(req.body)
    const { CampName, details} = req.body
    const user = await Roster.findOne({userName: req.session.user_id});
    const campaign = await Campaign.find({CampName});
    console.log(campaign)
    if(!campaign){
        res.redirect('/agenthome')
        console.log('fail')
    } else {
        let random = Math.floor(Math.random()*99999999) + 100001
        const campid = await Campaign.findOne({CampID: random});
        while(campid !== null){
            random = Math.floor(Math.random()*99999999) + 100001
        }
        const fi = req.body.CampName.replace(/\s/g, '');
        CampU = fi + random;
        const newCamp = new Campaign({
            CampID: random,
            CampU: CampU,
            CampName,
            details,
            addedBy: user.userName
        })
        await newCamp.save()
        res.redirect('/agenthome')
    }
})


//agent EOD
app.get('/eod', async (req, res) => {
    const user = await Roster.findOne({userName: req.session.user_id});
    const alleod = await FlexEOD.find({}).sort({created_at: -1});
    res.render('agenteod', {user, msg: req.flash(), err: req.flash(), alleod});
})

app.post('/eodpost', async (req, res) => {
    const user = await Roster.findOne({userName: req.session.user_id});
    const { remarks, challenges, actionItems, updates } = req.body
    let NewYork = momenttz.tz(new Date(), "America/New_York");
    let random = Math.floor(Math.random()*99999999) + 100001
    const flexEODid = await FlexEOD.findOne({eodID: random});
    while(flexEODid !== null){
        random = Math.floor(Math.random()*99999999) + 100001
    }
    const eodpost = new FlexEOD({
        eodID: random,
        eodDate: NewYork,
        userName: user.userName,
        remarks,
        challenges,
        actionItems,
        updates
    })
    await eodpost.save()
    res.redirect('/eod')
})

// admin routes
// adding State/Status

app.get('/addstate', (req, res) => {
    res.render('adminaddstate')
})
// adding new state
app.post('/addstate', async (req, res) => {
    const state = await State.find({});
    const {stateName, stateType} = req.body
    let random = Math.floor(Math.random()*99999999) + 100001
    const fi = stateName.replace(/\s/g, '');
    const stateid = await State.findOne({stateID: random});
    while(stateid !== null){
        random = Math.floor(Math.random()*99999999) + 100001
    }
    req.body.stateU = fi + random;
    const newState = new State({
        stateID: random,
        stateU: req.body.stateU,
        stateName,
        stateType
    })
    await newState.save()
    res.redirect('/addstate')
})

// roster management
app.get('/rostermanagement', (req, res) => {
    res.render('adminrostermanagement')
})

// adding user
app.post('/rostermanagement', async (req, res) => {
    const roster = await Roster.find({})
    req.body.sigID = roster[roster.length - 1].sigID + 1;
    const existUserName = await Roster.find({userName: req.body.userName});
    if (existUserName[0] == null) {
        const { sigID, firstName, lastName, userName, Title, password, isActive, isAdmin } = req.body;
        const hash = await bcrypt.hash(password, 12);
        const user = new Roster({
            sigID,
            firstName,
            lastName,
            Department: "Operations",
            Account: "FlexMG",
            Title,
            userName,
            password: hash,
            isActive,
            isAdmin
        })
        await user.save()
            .then(() => {
            res.redirect('/rostermanagement')
        })
    } else {
        res.send(`Username ${req.body.userName} is already taken!`)
    }
})


// logout route
app.post('/logout', (req, res) => {
    req.session.user_id = null;
    res.redirect('/');
})


// adding email
app.get('/addemail', async (req, res) => {
    const user = await Roster.findOne({userName: req.session.user_id});
    if(user.isActive && user.Account == "FlexMG"){
        res.render('agentaddemail')
    } else {
        res.redirect('/');
    }
})

// adding email put route
app.put('/addemail', async (req, res) => {
    const user = await Roster.findOne({userName: req.session.user_id});
    const {email, emailPassword} = req.body;
    const hash = await bcrypt.hash(emailPassword, 12);
    const filter = {userName: user.userName}
    const update = {
        email,
        emailPassword: hash
    }
    await Roster.findOneAndUpdate(filter, update);
    res.redirect('/');
})

//send email EOD
app.post('/sendeod', async (req, res) => {
    const user = await Roster.findOne({userName: req.session.user_id});
    const { pw } = req.body;
    let transporter = nodemailer.createTransport({
        host:'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: user.email,
            pass: pw
        },
        tls: {
            rejectUnauthorized:false
        }
    })
    transporter.use('compile', hbs({
        viewEngine: 'express-handlebars',
        viewPath: './views/'
    }));

    let MailOptions = {
        from: `"${user.firstName} ${user.lastName}" <${user.email}>`,
        to: 'rtregrogan@gmail.com',
        subject: 'Outbound Sales/Special Projects <> FlexMG | EOD 12/18/2020',
        text: '',
        template: 'eodemailtemplate'
    }

    transporter.sendMail(MailOptions, (error, info) => {
        if (error) {
            console.log(error)
            // req.flash('error','Please make user password is correct')
            // res.render('agenteod', {user, err: req.flash('error'), msg: req.flash()});
        }
        console.log(info)
        // req.flash('success','EOD SENT!')
        // res.render('agenteod', {user, msg: req.flash('success'), err: req.flash()});
    })
})

//api routes
app.get('/api', async (req, res) => {
    const campWorks = await AgentCamp.find({}).sort({fullName: -1});
    res.send(campWorks)
})

app.get('/campeod/api', async (req, res) =>{
    const campWorks = await AgentCamp.find({}).sort({CampName: -1});
    res.send(campWorks)
})

app.get('/allcampeod/api', async(req, res) => {
    const alleod = await FlexEOD.find({}).sort({created_at: -1});
    res.send(alleod)
})

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`port is at ${port}`);
});
