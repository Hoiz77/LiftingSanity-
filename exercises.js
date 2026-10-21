/* Lifting Sanity exercise library and ready-made splits.
   One exercise per line: name | primary muscle | equipment | how it's logged | secondary muscles | u = one side at a time
   Logged as: wr weight x reps, bw reps (+ optional added weight), aw assisted (weight helps you), dur time,
   wdur weight + time, dist distance + time, wdist weight + distance */

window.FORGE_LIBRARY = `
Barbell Bench Press|chest|barbell|wr|triceps,frontdelts
Incline Barbell Bench Press|chest|barbell|wr|frontdelts,triceps
Decline Barbell Bench Press|chest|barbell|wr|triceps
Paused Bench Press|chest|barbell|wr|triceps,frontdelts
Spoto Press|chest|barbell|wr|triceps
Larsen Press|chest|barbell|wr|triceps
Floor Press|chest|barbell|wr|triceps
Board Press|chest|barbell|wr|triceps
Pin Press|chest|barbell|wr|triceps
Reverse-Grip Bench Press|chest|barbell|wr|triceps,frontdelts
Wide-Grip Bench Press|chest|barbell|wr|frontdelts
Guillotine Press|chest|barbell|wr|frontdelts
Dumbbell Bench Press|chest|dumbbell|wr|triceps,frontdelts
Incline Dumbbell Press|chest|dumbbell|wr|frontdelts,triceps
Decline Dumbbell Press|chest|dumbbell|wr|triceps
Single-Arm Dumbbell Bench Press|chest|dumbbell|wr|triceps,obliques|u
Dumbbell Floor Press|chest|dumbbell|wr|triceps
Dumbbell Squeeze Press|chest|dumbbell|wr|triceps
Dumbbell Fly|chest|dumbbell|wr|frontdelts
Incline Dumbbell Fly|chest|dumbbell|wr|frontdelts
Decline Dumbbell Fly|chest|dumbbell|wr
Dumbbell Pullover|chest|dumbbell|wr|lats
Smith Machine Bench Press|chest|smith|wr|triceps,frontdelts
Smith Machine Incline Press|chest|smith|wr|frontdelts,triceps
Smith Machine Decline Press|chest|smith|wr|triceps
Machine Chest Press|chest|machine|wr|triceps,frontdelts
Incline Machine Chest Press|chest|machine|wr|frontdelts,triceps
Plate-Loaded Chest Press|chest|machine|wr|triceps
Single-Arm Machine Chest Press|chest|machine|wr|triceps|u
Pec Deck|chest|machine|wr|frontdelts
Cable Crossover|chest|cable|wr|frontdelts
High-to-Low Cable Fly|chest|cable|wr|frontdelts
Low-to-High Cable Fly|chest|cable|wr|frontdelts
Seated Cable Fly|chest|cable|wr|frontdelts
Single-Arm Cable Fly|chest|cable|wr|frontdelts|u
Cable Chest Press|chest|cable|wr|triceps
Single-Arm Cable Chest Press|chest|cable|wr|triceps,obliques|u
Landmine Chest Press|chest|landmine|wr|frontdelts,triceps
Svend Press|chest|plate|wr|frontdelts
Band Chest Fly|chest|band|wr
Band Push-Up|chest|band|bw|triceps
Push-Up|chest|bodyweight|bw|triceps,frontdelts
Incline Push-Up|chest|bodyweight|bw|triceps
Decline Push-Up|chest|bodyweight|bw|frontdelts,triceps
Wide Push-Up|chest|bodyweight|bw|frontdelts
Deficit Push-Up|chest|bodyweight|bw|triceps
Archer Push-Up|chest|bodyweight|bw|triceps|u
Plyo Push-Up|chest|bodyweight|bw|triceps
Ring Push-Up|chest|suspension|bw|triceps
Chest Dip|chest|bodyweight|bw|triceps,frontdelts
Assisted Dip|chest|machine|aw|triceps
Single-Arm Kettlebell Floor Press|chest|kettlebell|wr|triceps|u
Pull-Up|lats|bodyweight|bw|biceps,upperback
Chin-Up|lats|bodyweight|bw|biceps
Neutral-Grip Pull-Up|lats|bodyweight|bw|biceps
Wide-Grip Pull-Up|lats|bodyweight|bw|upperback
Negative Pull-Up|lats|bodyweight|bw|biceps
Scapular Pull-Up|lats|bodyweight|bw|upperback
Assisted Pull-Up|lats|machine|aw|biceps
Band-Assisted Pull-Up|lats|band|aw|biceps
Muscle-Up|lats|bodyweight|bw|triceps,chest
Lat Pulldown|lats|cable|wr|biceps,upperback
Wide-Grip Lat Pulldown|lats|cable|wr|upperback
Close-Grip Lat Pulldown|lats|cable|wr|biceps
Neutral-Grip Lat Pulldown|lats|cable|wr|biceps
Reverse-Grip Lat Pulldown|lats|cable|wr|biceps
Single-Arm Lat Pulldown|lats|cable|wr|biceps|u
Machine Lat Pulldown|lats|machine|wr|biceps
Straight-Arm Pulldown|lats|cable|wr|triceps
Cable Pullover|lats|cable|wr|chest
Machine Pullover|lats|machine|wr|chest
Barbell Row|lats|barbell|wr|upperback,biceps,lowerback
Pendlay Row|upperback|barbell|wr|lats,lowerback
Yates Row|lats|barbell|wr|biceps,upperback
Seal Row|upperback|barbell|wr|lats,reardelts
Smith Machine Row|lats|smith|wr|upperback
T-Bar Row|upperback|landmine|wr|lats,biceps
Chest-Supported T-Bar Row|upperback|machine|wr|lats,biceps
Meadows Row|lats|landmine|wr|upperback,biceps|u
Dumbbell Row|lats|dumbbell|wr|upperback,biceps|u
Kroc Row|lats|dumbbell|wr|upperback,forearms|u
Chest-Supported Dumbbell Row|upperback|dumbbell|wr|lats,reardelts
Renegade Row|lats|dumbbell|wr|abs,upperback|u
Gorilla Row|lats|kettlebell|wr|upperback
Seated Cable Row|upperback|cable|wr|lats,biceps
Wide-Grip Cable Row|upperback|cable|wr|reardelts
Single-Arm Cable Row|lats|cable|wr|biceps|u
Machine Row|upperback|machine|wr|lats,biceps
Iso-Lateral Machine Row|upperback|machine|wr|lats|u
High Row Machine|upperback|machine|wr|lats
Low Row Machine|lats|machine|wr|upperback
Inverted Row|upperback|bodyweight|bw|lats,biceps
Ring Row|upperback|suspension|bw|biceps
Band Row|upperback|band|wr|biceps
Rack Pull|upperback|barbell|wr|traps,lowerback,glutes
Deadlift|lowerback|barbell|wr|glutes,hamstrings,traps,forearms
Sumo Deadlift|glutes|barbell|wr|quads,adductors,hamstrings,lowerback
Deficit Deadlift|lowerback|barbell|wr|hamstrings,glutes
Paused Deadlift|lowerback|barbell|wr|hamstrings,glutes
Snatch-Grip Deadlift|lowerback|barbell|wr|upperback,hamstrings
Dumbbell Deadlift|lowerback|dumbbell|wr|glutes,hamstrings
Kettlebell Deadlift|glutes|kettlebell|wr|hamstrings
Back Extension|lowerback|bodyweight|bw|glutes,hamstrings
Back Extension Machine|lowerback|machine|wr|glutes
Reverse Hyperextension|glutes|machine|wr|lowerback,hamstrings
Superman|lowerback|bodyweight|bw|glutes
Bird Dog|lowerback|bodyweight|bw|abs,glutes
Jefferson Curl|lowerback|barbell|wr|hamstrings
Face Pull|reardelts|cable|wr|upperback,traps
Rear Delt Fly|reardelts|dumbbell|wr|upperback
Reverse Pec Deck|reardelts|machine|wr|upperback
Cable Rear Delt Fly|reardelts|cable|wr|upperback
Single-Arm Cable Rear Delt Fly|reardelts|cable|wr|upperback|u
Band Pull-Apart|reardelts|band|wr|upperback
Prone Y-Raise|traps|dumbbell|wr|reardelts
Cuban Press|reardelts|dumbbell|wr|sidedelts
Cable External Rotation|reardelts|cable|wr||u
Dumbbell External Rotation|reardelts|dumbbell|wr||u
Band External Rotation|reardelts|band|wr||u
Barbell Shrug|traps|barbell|wr|forearms
Dumbbell Shrug|traps|dumbbell|wr|forearms
Trap Bar Shrug|traps|trapbar|wr|forearms
Smith Machine Shrug|traps|smith|wr
Cable Shrug|traps|cable|wr
Machine Shrug|traps|machine|wr
Behind-the-Back Shrug|traps|barbell|wr
Snatch-Grip High Pull|traps|barbell|wr|upperback,sidedelts
Overhead Press|frontdelts|barbell|wr|triceps,sidedelts
Seated Barbell Overhead Press|frontdelts|barbell|wr|triceps
Push Press|frontdelts|barbell|wr|triceps,quads
Behind-the-Neck Press|frontdelts|barbell|wr|sidedelts,triceps
Z Press|frontdelts|barbell|wr|triceps,abs
Dumbbell Shoulder Press|frontdelts|dumbbell|wr|triceps,sidedelts
Seated Dumbbell Shoulder Press|frontdelts|dumbbell|wr|triceps
Arnold Press|frontdelts|dumbbell|wr|sidedelts,triceps
Single-Arm Dumbbell Shoulder Press|frontdelts|dumbbell|wr|triceps,obliques|u
Machine Shoulder Press|frontdelts|machine|wr|triceps
Smith Machine Shoulder Press|frontdelts|smith|wr|triceps
Landmine Press|frontdelts|landmine|wr|chest,triceps|u
Kettlebell Press|frontdelts|kettlebell|wr|triceps|u
Bottoms-Up Kettlebell Press|frontdelts|kettlebell|wr|forearms|u
Log Press|frontdelts|other|wr|triceps
Push Jerk|frontdelts|barbell|wr|quads,triceps
Pike Push-Up|frontdelts|bodyweight|bw|triceps
Handstand Push-Up|frontdelts|bodyweight|bw|triceps
Dumbbell Front Raise|frontdelts|dumbbell|wr
Cable Front Raise|frontdelts|cable|wr
Plate Front Raise|frontdelts|plate|wr
Barbell Front Raise|frontdelts|barbell|wr
Dumbbell Lateral Raise|sidedelts|dumbbell|wr
Seated Lateral Raise|sidedelts|dumbbell|wr
Cable Lateral Raise|sidedelts|cable|wr||u
Machine Lateral Raise|sidedelts|machine|wr
Leaning Lateral Raise|sidedelts|dumbbell|wr||u
Lu Raise|sidedelts|dumbbell|wr|frontdelts
Cable Y-Raise|sidedelts|cable|wr|traps
Band Lateral Raise|sidedelts|band|wr
Barbell Upright Row|sidedelts|barbell|wr|traps
Cable Upright Row|sidedelts|cable|wr|traps
Dumbbell Upright Row|sidedelts|dumbbell|wr|traps
Kettlebell Halo|frontdelts|kettlebell|wr|abs
Barbell Curl|biceps|barbell|wr|forearms
EZ-Bar Curl|biceps|ezbar|wr|forearms
Dumbbell Curl|biceps|dumbbell|wr|forearms
Alternating Dumbbell Curl|biceps|dumbbell|wr|forearms|u
Hammer Curl|biceps|dumbbell|wr|forearms
Cross-Body Hammer Curl|biceps|dumbbell|wr|forearms|u
Incline Dumbbell Curl|biceps|dumbbell|wr
EZ-Bar Preacher Curl|biceps|ezbar|wr
Dumbbell Preacher Curl|biceps|dumbbell|wr||u
Machine Preacher Curl|biceps|machine|wr
Machine Bicep Curl|biceps|machine|wr
Concentration Curl|biceps|dumbbell|wr||u
Spider Curl|biceps|dumbbell|wr
Cable Curl|biceps|cable|wr|forearms
Rope Hammer Curl|biceps|cable|wr|forearms
Single-Arm Cable Curl|biceps|cable|wr||u
Bayesian Cable Curl|biceps|cable|wr||u
Overhead Cable Curl|biceps|cable|wr
Drag Curl|biceps|barbell|wr
Zottman Curl|biceps|dumbbell|wr|forearms
Barbell 21s|biceps|barbell|wr
Waiter Curl|biceps|dumbbell|wr
Kettlebell Curl|biceps|kettlebell|wr
Band Curl|biceps|band|wr
Close-Grip Bench Press|triceps|barbell|wr|chest,frontdelts
JM Press|triceps|barbell|wr|chest
Skull Crusher|triceps|ezbar|wr
Dumbbell Skull Crusher|triceps|dumbbell|wr
Tate Press|triceps|dumbbell|wr
Rope Pushdown|triceps|cable|wr
Bar Pushdown|triceps|cable|wr
Reverse-Grip Pushdown|triceps|cable|wr
Single-Arm Cable Pushdown|triceps|cable|wr||u
Overhead Cable Triceps Extension|triceps|cable|wr
Single-Arm Overhead Cable Extension|triceps|cable|wr||u
Cross-Body Cable Extension|triceps|cable|wr||u
Cable Kickback|triceps|cable|wr||u
Dumbbell Kickback|triceps|dumbbell|wr||u
Overhead Dumbbell Extension|triceps|dumbbell|wr
Single-Arm Overhead Dumbbell Extension|triceps|dumbbell|wr||u
Machine Triceps Extension|triceps|machine|wr
Seated Dip Machine|triceps|machine|wr|chest
Triceps Dip|triceps|bodyweight|bw|chest,frontdelts
Bench Dip|triceps|bodyweight|bw|frontdelts
Ring Dip|triceps|suspension|bw|chest
Diamond Push-Up|triceps|bodyweight|bw|chest
Band Pushdown|triceps|band|wr
Barbell Wrist Curl|forearms|barbell|wr
Dumbbell Wrist Curl|forearms|dumbbell|wr||u
Reverse Wrist Curl|forearms|barbell|wr
Behind-the-Back Wrist Curl|forearms|barbell|wr
Reverse Curl|forearms|ezbar|wr|biceps
Wrist Roller|forearms|other|wr
Dead Hang|forearms|bodyweight|dur|lats
Plate Pinch|forearms|plate|wdur
Hand Gripper|forearms|other|bw||u
Farmer's Walk|forearms|dumbbell|wdist|traps,abs
Suitcase Carry|obliques|dumbbell|wdist|forearms|u
Overhead Carry|frontdelts|dumbbell|wdist|abs
Crunch|abs|bodyweight|bw
Decline Crunch|abs|bodyweight|bw
Cable Crunch|abs|cable|wr
Machine Crunch|abs|machine|wr
Sit-Up|abs|bodyweight|bw
Decline Sit-Up|abs|bodyweight|bw
Hanging Leg Raise|abs|bodyweight|bw|forearms
Hanging Knee Raise|abs|bodyweight|bw
Captain's Chair Leg Raise|abs|machine|bw
Toes-to-Bar|abs|bodyweight|bw|lats
Lying Leg Raise|abs|bodyweight|bw
Reverse Crunch|abs|bodyweight|bw
Ab Wheel Rollout|abs|other|bw|lats
Barbell Rollout|abs|barbell|bw|lats
Plank|abs|bodyweight|dur|obliques
Weighted Plank|abs|plate|wdur|obliques
Side Plank|obliques|bodyweight|dur||u
Copenhagen Plank|adductors|bodyweight|dur|obliques|u
Hollow Body Hold|abs|bodyweight|dur
L-Sit|abs|bodyweight|dur|triceps
Dead Bug|abs|bodyweight|bw
Dragon Flag|abs|bodyweight|bw
V-Up|abs|bodyweight|bw
Flutter Kicks|abs|bodyweight|dur
Mountain Climber|abs|bodyweight|bw|frontdelts
Stir the Pot|abs|other|bw
Bicycle Crunch|obliques|bodyweight|bw|abs
Russian Twist|obliques|plate|bw|abs
Heel Touch|obliques|bodyweight|bw
Dumbbell Side Bend|obliques|dumbbell|wr||u
Pallof Press|obliques|cable|wr|abs|u
Cable Woodchop|obliques|cable|wr|abs|u
Landmine Rotation|obliques|landmine|wr|abs
Hanging Windshield Wiper|obliques|bodyweight|bw|abs
Kettlebell Windmill|obliques|kettlebell|wr|frontdelts|u
Back Squat|quads|barbell|wr|glutes,adductors,lowerback
Low-Bar Squat|quads|barbell|wr|glutes,hamstrings,lowerback
Front Squat|quads|barbell|wr|glutes,abs
Paused Squat|quads|barbell|wr|glutes
Box Squat|quads|barbell|wr|glutes,hamstrings
Safety Bar Squat|quads|specialty|wr|glutes,upperback
Zercher Squat|quads|barbell|wr|glutes,abs
Overhead Squat|quads|barbell|wr|frontdelts,abs
Goblet Squat|quads|dumbbell|wr|glutes
Kettlebell Goblet Squat|quads|kettlebell|wr|glutes
Heel-Elevated Goblet Squat|quads|dumbbell|wr
Dumbbell Squat|quads|dumbbell|wr|glutes
Smith Machine Squat|quads|smith|wr|glutes
Hack Squat|quads|machine|wr|glutes
Pendulum Squat|quads|machine|wr|glutes
Belt Squat|quads|machine|wr|glutes
Landmine Squat|quads|landmine|wr|glutes
Leg Press|quads|machine|wr|glutes
Single-Leg Leg Press|quads|machine|wr|glutes|u
Leg Extension|quads|machine|wr
Single-Leg Extension|quads|machine|wr||u
Sissy Squat|quads|bodyweight|bw
Spanish Squat|quads|band|wr
Reverse Nordic|quads|bodyweight|bw
Bodyweight Squat|quads|bodyweight|bw|glutes
Jump Squat|quads|bodyweight|bw|glutes,calves
Pistol Squat|quads|bodyweight|bw|glutes|u
Bulgarian Split Squat|quads|dumbbell|wr|glutes|u
Smith Machine Bulgarian Split Squat|quads|smith|wr|glutes|u
Split Squat|quads|dumbbell|wr|glutes|u
Walking Lunge|quads|dumbbell|wr|glutes|u
Reverse Lunge|quads|dumbbell|wr|glutes|u
Dumbbell Lunge|quads|dumbbell|wr|glutes|u
Barbell Lunge|quads|barbell|wr|glutes|u
Step-Up|quads|dumbbell|wr|glutes|u
Box Jump|quads|bodyweight|bw|calves,glutes
Wall Sit|quads|bodyweight|dur
Trap Bar Deadlift|quads|trapbar|wr|glutes,hamstrings,lowerback,traps
Sled Push|quads|sled|wdist|glutes,calves
Sled Drag|quads|sled|wdist|glutes
Romanian Deadlift|hamstrings|barbell|wr|glutes,lowerback
Dumbbell Romanian Deadlift|hamstrings|dumbbell|wr|glutes
Smith Machine Romanian Deadlift|hamstrings|smith|wr|glutes
Single-Leg Romanian Deadlift|hamstrings|dumbbell|wr|glutes|u
Stiff-Leg Deadlift|hamstrings|barbell|wr|lowerback,glutes
Good Morning|hamstrings|barbell|wr|lowerback,glutes
Lying Leg Curl|hamstrings|machine|wr
Seated Leg Curl|hamstrings|machine|wr
Single-Leg Lying Curl|hamstrings|machine|wr||u
Standing Leg Curl|hamstrings|machine|wr||u
Dumbbell Leg Curl|hamstrings|dumbbell|wr
Nordic Hamstring Curl|hamstrings|bodyweight|bw
Glute-Ham Raise|hamstrings|bodyweight|bw|glutes
Swiss Ball Hamstring Curl|hamstrings|other|bw|glutes
Barbell Hip Thrust|glutes|barbell|wr|hamstrings
Machine Hip Thrust|glutes|machine|wr|hamstrings
Smith Machine Hip Thrust|glutes|smith|wr|hamstrings
Dumbbell Hip Thrust|glutes|dumbbell|wr|hamstrings
B-Stance Hip Thrust|glutes|barbell|wr|hamstrings|u
Single-Leg Hip Thrust|glutes|bodyweight|bw|hamstrings|u
Glute Bridge|glutes|bodyweight|bw|hamstrings
Barbell Glute Bridge|glutes|barbell|wr|hamstrings
Single-Leg Glute Bridge|glutes|bodyweight|bw|hamstrings|u
Frog Pump|glutes|bodyweight|bw
Cable Glute Kickback|glutes|cable|wr||u
Glute Kickback Machine|glutes|machine|wr||u
Donkey Kick|glutes|bodyweight|bw||u
Cable Pull-Through|glutes|cable|wr|hamstrings
Kettlebell Swing|glutes|kettlebell|wr|hamstrings,lowerback
Curtsy Lunge|glutes|dumbbell|wr|quads,abductors|u
Hip Abduction Machine|abductors|machine|wr|glutes
Cable Hip Abduction|abductors|cable|wr|glutes|u
Banded Lateral Walk|abductors|band|bw|glutes
Clamshell|abductors|band|bw|glutes|u
Fire Hydrant|abductors|bodyweight|bw|glutes|u
Hip Adduction Machine|adductors|machine|wr
Cable Hip Adduction|adductors|cable|wr||u
Dumbbell Sumo Squat|adductors|dumbbell|wr|quads,glutes
Lateral Lunge|adductors|dumbbell|wr|quads,glutes|u
Cossack Squat|adductors|bodyweight|bw|quads,glutes|u
Standing Calf Raise|calves|machine|wr
Seated Calf Raise|calves|machine|wr
Leg Press Calf Raise|calves|machine|wr
Smith Machine Calf Raise|calves|smith|wr
Donkey Calf Raise|calves|machine|wr
Single-Leg Calf Raise|calves|dumbbell|wr||u
Bodyweight Calf Raise|calves|bodyweight|bw
Tibialis Raise|calves|other|bw
Plate Neck Curl|neck|plate|wr
Plate Neck Extension|neck|plate|wr
Neck Harness Extension|neck|other|wr
Lateral Neck Flexion|neck|plate|wr||u
Power Clean|fullbody|barbell|wr|traps,quads,glutes
Hang Clean|fullbody|barbell|wr|traps,quads
Clean and Jerk|fullbody|barbell|wr|quads,frontdelts
Power Snatch|fullbody|barbell|wr|traps,frontdelts
Snatch|fullbody|barbell|wr|quads,frontdelts
Barbell Thruster|fullbody|barbell|wr|quads,frontdelts
Dumbbell Thruster|fullbody|dumbbell|wr|quads,frontdelts
Dumbbell Snatch|fullbody|dumbbell|wr|frontdelts,glutes|u
Kettlebell Clean|fullbody|kettlebell|wr|glutes|u
Kettlebell Snatch|fullbody|kettlebell|wr|frontdelts,glutes|u
Turkish Get-Up|fullbody|kettlebell|wr|abs,frontdelts|u
Man Maker|fullbody|dumbbell|wr|chest,frontdelts
Burpee|fullbody|bodyweight|bw|chest,quads
Wall Ball|fullbody|medball|wr|quads,frontdelts
Medicine Ball Slam|fullbody|medball|wr|abs,lats
Rotational Med Ball Throw|obliques|medball|wr|abs|u
Atlas Stone Lift|fullbody|other|wr|glutes,upperback
Yoke Carry|fullbody|other|wdist|quads,traps
Sandbag Carry|fullbody|other|wdist|abs
Tire Flip|fullbody|other|bw|glutes,quads
Battle Ropes|fullbody|other|dur|frontdelts
Bear Crawl|fullbody|bodyweight|dur|frontdelts,abs
Front Lever Hold|lats|bodyweight|dur|abs
Planche Lean|frontdelts|bodyweight|dur|chest
Treadmill Run|cardio|cardio|dist|quads
Incline Treadmill Walk|cardio|cardio|dist|calves
Outdoor Run|cardio|other|dist|quads
Stationary Bike|cardio|cardio|dist|quads
Outdoor Cycling|cardio|other|dist|quads
Rowing Machine|cardio|cardio|dist|lats
Elliptical|cardio|cardio|dist
Stair Climber|cardio|cardio|dur|glutes
Assault Bike|cardio|cardio|dist|fullbody
SkiErg|cardio|cardio|dist|lats
Jump Rope|cardio|other|dur|calves
Swimming|cardio|other|dist|fullbody
Hiking|cardio|other|dist
Walking|cardio|other|dist
Sprints|cardio|bodyweight|dist|hamstrings
Jumping Jacks|cardio|bodyweight|bw
High Knees|cardio|bodyweight|dur
Bag Work|cardio|other|dur|frontdelts
Hip Flexor Stretch|mobility|bodyweight|dur||u
Couch Stretch|mobility|bodyweight|dur||u
Pigeon Stretch|mobility|bodyweight|dur||u
Hamstring Stretch|mobility|bodyweight|dur||u
Frog Stretch|mobility|bodyweight|dur
Calf Stretch|mobility|bodyweight|dur||u
Lat Stretch|mobility|bodyweight|dur||u
Doorway Chest Stretch|mobility|bodyweight|dur
Child's Pose|mobility|bodyweight|dur
Deep Squat Hold|mobility|bodyweight|dur
World's Greatest Stretch|mobility|bodyweight|bw||u
Cat-Cow|mobility|bodyweight|bw
Open Book Rotation|mobility|bodyweight|bw||u
90/90 Hip Switch|mobility|bodyweight|bw
Knee-to-Wall Ankle Mobility|mobility|bodyweight|bw||u
Band Shoulder Dislocate|mobility|band|bw
Foam Rolling|mobility|other|dur
Lever Seated Fly|chest|machine|wr|frontdelts
Lever Shoulder Press|frontdelts|machine|wr|triceps,sidedelts
Side Lateral Standing|sidedelts|machine|wr||u
Gym Leco Preacher|biceps|machine|wr|forearms|u
Cable Standing Reverse Grip Curl|forearms|cable|wr|biceps|u
S/A Cuffed Pushdown|triceps|cable|wr||u
Lever Pullover|lats|machine|wr|chest
Lever Front Pulldown|lats|machine|wr|biceps,upperback
Cable Seated Horizontal Shrug|traps|cable|wr|upperback
Lever Total Abdominal Crunch|abs|machine|wr
Lever Gripper Hands|forearms|machine|wr
Lever Seated Leg Curl|hamstrings|machine|wr
Lever Seated Hip Adduction|adductors|machine|wr
Lever Seated Hip Abduction|abductors|machine|wr|glutes
Lever Leg Extension|quads|machine|wr
Lever Seated Squat Calf Raise|calves|machine|wr||u
`;

/* Ready-made splits. Each line of a day: exercise | sets | reps | RIR target | rest in seconds
   sets: "2w+3" = 2 warm-ups then 3 working, "3+1d" = 3 working then a drop set,
   letters: w warm-up, t top set, b back-off, d drop, f failure, a AMRAP, p partials, m myo-reps.
   A day can also list each set as [type, starting weight in kg, target reps, target RIR, side L/R],
   and 'rest' in a split's days is a rest day. */
window.FORGE_PROGRAMS = [
  {
    id: 'fbeod', name: 'Full Body EOD', freq: 'Every other day',
    about: 'A full-body machine session: train one day, rest the next. Seventeen exercises with warm-ups, low rep ranges taken close to failure, and one-side-at-a-time work for arms and calves.',
    note: 'Low rep ranges, taken close to failure. Hit the top of the range on every set and the app suggests adding weight.',
    days: [
      ['Full Body', [
        { ex: 'Lever Seated Fly', rest: 120, sets: [['W', 72.5, 4], ['N', 80, '5-7', 1], ['N', 80, '5-7', 1]] },
        { ex: 'Lever Shoulder Press', rest: 120, sets: [['W', 50, 3], ['N', 55, '4-6', 1], ['N', 55, '4-6', 0]] },
        { ex: 'Side Lateral Standing', uni: true, rest: 90, sets: [['W', 45, 3, null, 'R'], ['W', 45, 3, null, 'L'], ['N', 45, '5-7', 1, 'R'], ['N', 45, '5-7', 2, 'L']] },
        { ex: 'Gym Leco Preacher', uni: true, rest: 90, sets: [['W', 30, 3, null, 'L'], ['W', 30, 3, null, 'R'], ['N', 32, '5-7', 1, 'L'], ['N', 32, '5-7', 1, 'R']] },
        { ex: 'Cable Standing Reverse Grip Curl', uni: true, rest: 90, sets: [['W', 36, 4, null, 'L'], ['W', 36, 4, null, 'R'], ['N', 41, '8-10', 0, 'L'], ['N', 41, '8-10', 1, 'R']] },
        { ex: 'S/A Cuffed Pushdown', uni: true, rest: 90, sets: [['W', 43, 6, null, 'R'], ['W', 43, 6, null, 'L'], ['N', 52, '7-9', 0, 'R'], ['N', 52, '7-9', 0, 'L']] },
        { ex: 'Lever Pullover', rest: 120, sets: [['W', 70, 6], ['N', 80, '4-6', 1], ['N', 80, '4-6', 0]] },
        { ex: 'Lever Front Pulldown', rest: 120, sets: [['W', 70, 4], ['N', 80, '5-7', 1], ['N', 80, '5-7', 0]] },
        { ex: 'Cable Seated Horizontal Shrug', rest: 90, sets: [['N', 60, '5-7', 2], ['N', 60, '5-7', 0]] },
        { ex: 'Lever Total Abdominal Crunch', rest: 90, sets: [['W', 15, 6], ['W', 15, 6], ['W', 15, 6], ['N', 20, '6-8', 0]] },
        { ex: 'Lever Gripper Hands', rest: 90, sets: [['W', 40, 12], ['N', 62.5, '6-8', 0]] },
        { ex: 'Lever Seated Leg Curl', rest: 120, sets: [['W', 65, 4], ['N', 72.5, '5-7', 0]] },
        { ex: 'Lever Seated Hip Adduction', rest: 120, sets: [['W', 102, 4], ['N', 128.7, '8-10', 1]] },
        { ex: 'Lever Seated Hip Abduction', rest: 120, sets: [['W', 80, 6], ['N', 110, '8-10', 0]] },
        { ex: 'Lever Leg Extension', rest: 120, sets: [['W', 80, 7], ['N', 110, '8-10', 1]] },
        { ex: 'Barbell Glute Bridge', rest: 120, sets: [['W', 93.7, 6], ['N', 93.7, '10-12', 0]] },
        { ex: 'Lever Seated Squat Calf Raise', uni: true, rest: 90, sets: [['W', 80, 5, null, 'L'], ['W', 80, 5, null, 'R'], ['N', 102.5, '4-6', 1, 'L'], ['N', 102.5, '4-6', 1, 'R']] }
      ]],
      'rest'
    ]
  },
  {
    id: 'ppl', name: 'Push / Pull / Legs', freq: '3 or 6 days a week',
    about: 'The classic split. Run the three days in order, once or twice a week.',
    days: [
      ['Push', `
Barbell Bench Press|2w+3|5-8|2|180
Incline Dumbbell Press|3|8-12|2|120
Seated Dumbbell Shoulder Press|3|8-12|2|120
Cable Lateral Raise|3+1d|12-15|1|60
Rope Pushdown|3|10-15|1|60
Overhead Cable Triceps Extension|2|12-15|1|60`],
      ['Pull', `
Pull-Up|1w+3|6-10|2|150
Barbell Row|3|6-10|2|150
Seated Cable Row|3|10-12|2|90
Face Pull|3|15-20|1|60
Barbell Curl|3|8-12|1|75
Hammer Curl|2|10-15|1|60`],
      ['Legs', `
Back Squat|2w+3|5-8|2|180
Romanian Deadlift|3|8-10|2|150
Leg Press|3|10-15|2|120
Lying Leg Curl|3|10-15|1|90
Leg Extension|2+1d|12-15|1|60
Standing Calf Raise|4|10-15|1|60`]
    ]
  },
  {
    id: 'ul', name: 'Upper / Lower', freq: '4 days a week',
    about: 'Two upper and two lower days: a heavier day and a higher-rep day for each.',
    days: [
      ['Upper A', `
Barbell Bench Press|2w+4|4-6|2|180
Barbell Row|4|6-8|2|150
Overhead Press|3|6-8|2|150
Lat Pulldown|3|8-12|2|90
EZ-Bar Curl|2|10-12|1|60
Skull Crusher|2|10-12|1|60`],
      ['Lower A', `
Back Squat|2w+4|4-6|2|180
Romanian Deadlift|3|6-8|2|150
Bulgarian Split Squat|3|8-10|2|90
Seated Leg Curl|3|10-12|1|75
Standing Calf Raise|4|8-12|1|60
Hanging Leg Raise|3|10-15|1|60`],
      ['Upper B', `
Incline Dumbbell Press|3|8-12|2|120
Chest-Supported Dumbbell Row|3|10-12|2|90
Machine Shoulder Press|3|10-12|2|90
Neutral-Grip Lat Pulldown|3|10-12|2|90
Dumbbell Lateral Raise|3|12-20|1|60
Cable Curl|3|12-15|1|60
Rope Pushdown|3|12-15|1|60`],
      ['Lower B', `
Deadlift|2w+3|3-5|2|180
Hack Squat|3|8-12|2|120
Barbell Hip Thrust|3|8-12|2|90
Lying Leg Curl|3|10-15|1|75
Leg Extension|3|12-15|1|60
Seated Calf Raise|4|12-15|1|60`]
    ]
  },
  {
    id: 'fb', name: 'Full Body', freq: '3 days a week',
    about: 'Every session hits the whole body. Leave a rest day between sessions.',
    days: [
      ['Full Body A', `
Back Squat|2w+3|5-8|2|180
Barbell Bench Press|1w+3|5-8|2|150
Seated Cable Row|3|8-12|2|90
Dumbbell Lateral Raise|3|12-15|1|60
Plank|3|45s||60`],
      ['Full Body B', `
Deadlift|2w+3|3-5|2|180
Overhead Press|1w+3|6-8|2|150
Pull-Up|3|6-10|2|120
Walking Lunge|3|10-12|2|90
Hammer Curl|2|10-12|1|60`],
      ['Full Body C', `
Leg Press|1w+3|10-12|2|120
Incline Dumbbell Press|3|8-12|2|120
Lat Pulldown|3|10-12|2|90
Barbell Hip Thrust|3|8-12|2|90
Rope Pushdown|2|12-15|1|60
Cable Crunch|3|12-15|1|60`]
    ]
  },
  {
    id: 'bro', name: 'Bro Split', freq: '5 days a week',
    about: 'One body part a day, lots of volume for each.',
    days: [
      ['Chest', `
Barbell Bench Press|2w+4|6-10|2|150
Incline Dumbbell Press|3|8-12|2|120
Machine Chest Press|3|10-12|1|90
Cable Crossover|3|12-15|1|60
Chest Dip|2|8-12|1|90`],
      ['Back', `
Deadlift|2w+3|5|2|180
Pull-Up|3|6-10|2|120
T-Bar Row|3|8-12|2|90
Lat Pulldown|3|10-12|1|90
Straight-Arm Pulldown|3|12-15|1|60
Barbell Shrug|3|10-12|1|60`],
      ['Shoulders', `
Overhead Press|2w+4|6-8|2|150
Arnold Press|3|8-12|2|90
Dumbbell Lateral Raise|3+1d|12-20|1|60
Reverse Pec Deck|3|12-15|1|60
Face Pull|3|15|1|60
Dumbbell Shrug|3|12|1|60`],
      ['Arms', `
EZ-Bar Curl|4|8-12|1|75
Close-Grip Bench Press|4|6-10|2|120
Incline Dumbbell Curl|3|10-12|1|60
Overhead Cable Triceps Extension|3|10-12|1|60
Hammer Curl|3|10-12|1|60
Rope Pushdown|2+1d|12-15|1|60
Barbell Wrist Curl|2|15|1|45`],
      ['Legs', `
Back Squat|2w+4|6-10|2|180
Leg Press|3|10-12|2|120
Romanian Deadlift|3|8-10|2|120
Leg Extension|3|12-15|1|60
Seated Leg Curl|3|10-12|1|60
Standing Calf Raise|4|10-15|1|60`]
    ]
  },
  {
    id: 'arnold', name: 'Arnold Split', freq: '6 days a week',
    about: 'Chest and back together, shoulders and arms together, then legs. Run it twice a week.',
    days: [
      ['Chest & Back', `
Barbell Bench Press|1w+4|6-10|2|120
Pull-Up|4|8-10|2|120
Incline Dumbbell Press|3|8-12|2|90
Barbell Row|3|8-12|2|90
Dumbbell Fly|3|10-12|1|60
Dumbbell Pullover|3|10-12|1|60`],
      ['Shoulders & Arms', `
Overhead Press|1w+4|6-10|2|120
Dumbbell Lateral Raise|4|10-15|1|60
Barbell Curl|3|8-12|1|75
Close-Grip Bench Press|3|8-12|2|90
Dumbbell Curl|3|10-12|1|60
Skull Crusher|3|10-12|1|60
Barbell Wrist Curl|2|15|1|45`],
      ['Legs', `
Back Squat|2w+4|6-10|2|180
Leg Press|3|10-12|2|120
Lying Leg Curl|3|10-12|1|75
Stiff-Leg Deadlift|3|8-10|2|120
Walking Lunge|2|12|1|90
Standing Calf Raise|5|10-15|1|60`]
    ]
  },
  {
    id: 'phul', name: 'PHUL', freq: '4 days a week',
    about: 'Power Hypertrophy Upper Lower: two heavy days for strength, two pump days for size.',
    days: [
      ['Upper Power', `
Barbell Bench Press|2w+3|3-5|2|180
Barbell Row|3|3-5|2|180
Overhead Press|3|5-8|2|150
Lat Pulldown|3|6-10|2|90
Barbell Curl|2|6-10|1|75
Skull Crusher|2|6-10|1|75`],
      ['Lower Power', `
Back Squat|2w+3|3-5|2|180
Deadlift|1w+3|3-5|2|180
Leg Press|3|10-15|2|120
Lying Leg Curl|3|6-10|1|75
Standing Calf Raise|4|6-10|1|60`],
      ['Upper Hypertrophy', `
Incline Barbell Bench Press|3|8-12|2|120
Pec Deck|3|8-12|1|60
Seated Cable Row|3|8-12|2|90
Dumbbell Row|3|8-12|2|90
Dumbbell Lateral Raise|3|8-12|1|60
Incline Dumbbell Curl|3|8-12|1|60
Rope Pushdown|3|8-12|1|60`],
      ['Lower Hypertrophy', `
Front Squat|1w+3|8-12|2|150
Walking Lunge|3|8-12|2|90
Leg Extension|3|10-15|1|60
Seated Leg Curl|3|10-15|1|60
Seated Calf Raise|3|8-12|1|60
Cable Crunch|3|10-15|1|60`]
    ]
  },
  {
    id: '5x5', name: '5×5 Strength', freq: '3 days a week',
    about: 'Alternate A and B. Add weight every session you get all five sets of five.',
    days: [
      ['Workout A', `
Back Squat|2w+5|5||180
Barbell Bench Press|2w+5|5||180
Barbell Row|5|5||150`],
      ['Workout B', `
Back Squat|2w+5|5||180
Overhead Press|2w+5|5||180
Deadlift|2w+1|5||180`]
    ]
  },
  {
    id: 'db', name: 'Dumbbells Only', freq: '2 to 4 days a week',
    about: 'Needs just dumbbells and a bench. Good for home or a crowded gym.',
    days: [
      ['Dumbbell A', `
Goblet Squat|3|10-15|2|90
Dumbbell Bench Press|3|8-12|2|90
Dumbbell Row|3|10-12|2|75
Dumbbell Shoulder Press|3|10-12|2|75
Dumbbell Curl|2|12|1|60
Plank|3|45s||45`],
      ['Dumbbell B', `
Dumbbell Romanian Deadlift|3|10-12|2|90
Bulgarian Split Squat|3|8-12|2|75
Push-Up|3a|AMRAP||75
Chest-Supported Dumbbell Row|3|10-12|2|75
Dumbbell Lateral Raise|3|12-15|1|60
Overhead Dumbbell Extension|2|12|1|60
Dead Bug|3|10||45`]
    ]
  }
];
