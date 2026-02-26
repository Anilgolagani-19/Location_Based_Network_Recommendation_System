const BACKEND_URL = 'http://localhost:5000';

/* =========================
Helper
========================= */
function num(id){
const el=document.getElementById(id);
if(!el || el.value==='') return 0;
return Number(el.value);
}

function val(id){
const el=document.getElementById(id);
return el ? el.value : '';
}

/* =========================
Build 25-feature vector
========================= */
function buildInputVector(){

const deviceOS = val('device_os');
const operator = val('operator');
const plan = val('plan');
const payment = val('payment');

const features = {


/* ==== numeric ==== */
"Mobile_age": num('Mobile_age'),
"Network_type": num('Network_type'),
"AVG_upload_speed_Mbps(last 30 days)": num('upload'),
"AVG_download_speed_Mbps(last 30 days)": num('download'),
"AVG_jitter_ms(last 30 days)": num('jitter'),
"AVG_Packetloss_%(last 30 days)": num('packet'),
"Tower_density(towers per km²)": num('tower'),
"Signal_strength_dBm": num('signal'),
"Congestion_Level_pct_30d": num('congestion'),
"Total_Calls_by_Customers": num('calls'),
"No_of_Issues_Resolved": num('issues'),
"Satisfactory_Level": num('satisfaction'),
"Months_Active": num('months'),
"Latency_Score": num('latency'),

/* ==== one hot ==== */

// Device OS
"Device_OS_type_Android": deviceOS==="Android"?1:0,
"Device_OS_type_iOS": deviceOS==="iOS"?1:0,

// Operator
"Operator_Airtel": operator==="Airtel"?1:0,
"Operator_BSNL": operator==="BSNL"?1:0,
"Operator_Jio": operator==="Jio"?1:0,
"Operator_Vi": operator==="Vi"?1:0,

// Plan
"Plan_Type_3 Months Plan": plan==="3 Months Plan"?1:0,
"Plan_Type_Monthly Plan": plan==="Monthly Plan"?1:0,
"Plan_Type_Yearly Plan": plan==="Yearly Plan"?1:0,

// Payment
"pre/post_paid_Postpaid": payment==="Postpaid"?1:0,
"pre/post_paid_Prepaid": payment==="Prepaid"?1:0


};

console.log("🔥 Sending 25 features:",features);
return features;
}

/* =========================
Backend health
========================= */
async function checkBackendHealth(){
try{
const res=await fetch(BACKEND_URL+'/models');
if(res.ok){
updateStatus('✓ Backend Ready','#d4edda','#155724');
}else{
updateStatus('⚠ Backend Error','#f8d7da','#721c24');
}
}catch{
updateStatus('✗ Backend Offline','#f8d7da','#721c24');
}
}

function updateStatus(t,bg,c){
const el=document.getElementById('backend-status');
if(!el) return;
el.value=t;
el.style.background=bg;
el.style.color=c;
}

/* =========================
Reset
========================= */
document.getElementById('reset').onclick=e=>{
e.preventDefault();
document.querySelectorAll('input').forEach(i=>i.value='');
document.querySelectorAll('select').forEach(s=>s.selectedIndex=0);
};

/* =========================
Predict
========================= */
document.getElementById('send').onclick=async e=>{
e.preventDefault();

const btn=document.getElementById('send');
btn.disabled=true;
updateStatus('⏳ Predicting...','#fff3cd','#856404');

try{


const res=await fetch(BACKEND_URL+'/predict',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
    model:'rf',
    features:buildInputVector()
  })
});

const data=await res.json();
showResult(data);

updateStatus('✓ Done','#d4edda','#155724');


}catch(err){
showError(err.message);
updateStatus('✗ Failed','#f8d7da','#721c24');
}

btn.disabled=false;
};

/* =========================
UI result
========================= */
function showResult(data){

if(!data.results){showError('No result');return;}

const r=data.results[0];
const churn=r.prediction===1;

const card=document.getElementById('prediction-result');
const label=document.getElementById('prediction-label');
const value=document.getElementById('prediction-value');
const proba=document.getElementById('prediction-proba');

const p=r.proba||[0.5,0.5];

label.textContent=churn?'⚠️ Churn TRUE':'❌ Churn FALSE';
value.textContent=churn?'TRUE':'FALSE';
proba.innerHTML=`Not churn ${(p[0]*100).toFixed(1)}% | Churn ${(p[1]*100).toFixed(1)}%`;

card.classList.add('show');
}

function showError(msg){
const e=document.getElementById('prediction-error');
e.textContent=msg;
e.classList.add('show');
}

/* =========================
Init
========================= */
document.addEventListener('DOMContentLoaded',checkBackendHealth);
