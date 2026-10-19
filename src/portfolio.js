export function initPortfolio(){
document.getElementById('year').textContent=new Date().getFullYear();
const toast=document.getElementById('toast');let toastTimer;
function notify(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2400)}
document.getElementById('forceBtn').addEventListener('click',()=>{document.body.animate([{filter:'brightness(1)'},{filter:'brightness(1.8)'},{filter:'brightness(1)'}],{duration:650});notify('THE FORCE IS STRONG WITH THIS ONE.');});
document.getElementById('top').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
const jokes=[
'My code doesn’t have bugs. It has unexpected lore.',
'I tried to touch grass, but it had a dependency conflict.',
'There are 10 kinds of people: those who understand binary, and those who need better documentation.',
'Debugging is like being a detective in a crime movie where you are also the criminal.',
'My sleep schedule is an experimental branch. It should not be merged.',
'The universe is expanding. My TODO list is expanding faster.',
'I asked the Force for a sign. It returned undefined.',
'Philosophy is asking why we exist. Programming is asking why it exists only on my machine.'
];
let jokeIndex=0;document.getElementById('newJoke').addEventListener('click',()=>{jokeIndex=(jokeIndex+1+Math.floor(Math.random()*(jokes.length-1)))%jokes.length;document.getElementById('joke').innerHTML='<small>JOKE OF THE CYCLE</small>'+jokes[jokeIndex]});
const questions=[
{q:'Production is down. What is your first move?',a:[['A. Read the logs before touching anything.',2],['B. Deploy a fix and trust the Force.',1],['C. Blame the intern. I am the intern.',0]]},
{q:'Your code works. What do you do next?',a:[['A. Refactor it until it becomes a thesis.',2],['B. Test it, document it, ship it.',1],['C. Close the laptop before it changes its mind.',0]]},
{q:'You discover the meaning of life in a comment.',a:[['A. Write a paper, then question the paper.',2],['B. Turn it into a variable name.',1],['C. Add “TODO: understand existence”.',0]]}
];
let qi=0,score=0,playing=false;
const qEl=document.getElementById('question'), choices=document.getElementById('choices'), stepEl=document.getElementById('gameStep'), res=document.getElementById('result'), progress=document.getElementById('progress');
function begin(){qi=0;score=0;playing=true;res.textContent='TRIAL IN PROGRESS';renderQuestion()}
function renderQuestion(){const q=questions[qi];stepEl.textContent='TRIAL '+String(qi+1).padStart(2,'0')+' / 03';qEl.textContent=q.q;choices.innerHTML='';q.a.forEach(([label,points])=>{const b=document.createElement('button');b.className='choice';b.textContent=label;b.onclick=()=>{score+=points;qi++;progress.style.width=(qi/3*100)+'%';if(qi<questions.length)renderQuestion();else finish()};choices.appendChild(b)});res.textContent='SELECT YOUR RESPONSE'}
function finish(){playing=false;let title,desc;if(score>=5){title='THE COSMIC STRATEGIST';desc='Curiosity with a plan. You seek the root cause, then question the universe for good measure.'}else if(score>=2){title='THE BUILDER OF BALANCE';desc='Practical, curious, and capable of shipping. The galaxy needs people who can finish a project.'}else{title='CHAOTIC GOOD: DEVELOPER EDITION';desc='Your method is unconventional. Your commit messages are probably worse. Somehow, things ship.'}stepEl.textContent='TRIAL COMPLETE / PROFILE GENERATED';qEl.textContent=title;choices.innerHTML='<p style="color:#b6a5a5;line-height:1.8;font-size:14px">'+desc+'</p><button class="btn primary" id="playAgain">Run it back ↻</button>';document.getElementById('playAgain').onclick=begin;res.textContent='ALIGNMENT: '+score+'/6';progress.style.width='100%';notify('ALIGNMENT CALCULATED. DESTINY NOT GUARANTEED.')}
document.getElementById('startGame').onclick=begin;document.getElementById('restart').onclick=()=>{playing=false;qi=0;score=0;stepEl.textContent='AWAITING INITIATION...';qEl.textContent='Ready to discover what kind of developer lurks within?';choices.innerHTML='<button class="choice" id="init">Initialize the simulation</button>';document.getElementById('init').onclick=begin;res.textContent='SYSTEM STANDBY';progress.style.width='0%'};
document.getElementById('choices').addEventListener('click',e=>{if(e.target.dataset.start)begin()});

// Checkpoint tasks: each selected section unlocks only after its checkbox is ticked.
document.querySelectorAll('.clearance-gate').forEach(gate=>{
  const check=gate.querySelector('.clearance-check-input');
  const button=gate.querySelector('.clearance-unlock');
  const section=gate.closest('section');
  check.addEventListener('change',()=>{button.disabled=!check.checked;});
  button.addEventListener('click',()=>{
    if(!check.checked)return;
    section.classList.add('clearance-open');
    gate.style.display='none';
    if(typeof notify==='function') notify('CLEARANCE GRANTED. SECTION UNLOCKED.');
  });
});

const thoughtBank=[
  ['DEBUGGING PHILOSOPHY','A bug is not proof that you are a bad developer. It is evidence that your mental model and reality have stopped agreeing.'],
  ['THE DARK SIDE OF DEBUGGING','The dark side of debugging is not anger. It is changing five things at once and then claiming you know which one fixed it.'],
  ['SITH DISCIPLINE','Discipline is choosing the long-term system over the short-term mood—even when nobody is watching the commit history.'],
  ['COSMIC CURIOSITY','The universe does not owe us an explanation. Curiosity is how we politely keep asking for one.'],
  ['ENGINEERING HUMILITY','Confidence says “I can solve this.” Arrogance says “I do not need to test it.” Production knows the difference.'],
  ['THE FORCE OF LOGS','Logs are memories for a system that cannot explain itself. Good observability is compassion for your future self.'],
  ['AMBITION WITHOUT BLINDNESS','Ambition can be fuel. If it becomes your steering wheel, you may move quickly in the wrong direction.'],
  ['PHILOSOPHY OF FAILURE','Failure is an event, not an identity. Inspect the cause, keep the lesson, and do not ship the shame.'],
  ['THE SITH AND SOFTWARE','Power without reflection becomes control. Code without tests becomes a very confident form of chaos.'],
  ['THE UNKNOWN','A question that survives your first answer is often the one worth keeping.'],
  ['DEBUGGING AS SCIENCE','Change one variable, observe the result, write down what happened. That is science wearing a hoodie.'],
  ['THE DARK SIDE OF SHORTCUTS','A shortcut is only clever if you count the maintenance cost. Otherwise it is a loan with terrible interest.'],
  ['LEARNING IN PUBLIC','A learning log is proof that progress can be messy and still be real. Document the attempt, not just the victory.'],
  ['THE COSMIC MIND','You are a small observer in a vast universe, but you can still build things that make someone else’s day easier.'],
  ['CODE AND CHARACTER','Your best engineering decision may be the one that prevents a problem nobody will ever notice.']
];
let previousThought=-1;
const generateThought=document.getElementById('generateThought');
if(generateThought){
  generateThought.addEventListener('click',()=>{
    let n=Math.floor(Math.random()*thoughtBank.length);
    if(thoughtBank.length>1&&n===previousThought)n=(n+1)%thoughtBank.length;
    previousThought=n;
    document.getElementById('thoughtCategory').textContent=thoughtBank[n][0];
    const target=document.getElementById('thoughtText');
    target.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:420});
    target.textContent=thoughtBank[n][1];
    if(typeof notify==='function')notify('NEW HOLOCRON TRANSMISSION RECEIVED.');
  });
}
const copyThought=document.getElementById('copyThought');
if(copyThought)copyThought.addEventListener('click',async()=>{
  const text=document.getElementById('thoughtCategory').textContent+' — '+document.getElementById('thoughtText').textContent;
  try{await navigator.clipboard.writeText(text);notify('THOUGHT COPIED TO CLIPBOARD.');}
  catch(e){notify('SELECT THE THOUGHT TEXT TO COPY IT.');}
});

}