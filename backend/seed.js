const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user.model');
const Entraineur = require('./models/entraineur.model');
const Nageur = require('./models/nageur.model');

const MONGO_URI = 'mongodb://localhost:27017/PFE_NATATION';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    const passwordHash = await bcrypt.hash('123456', 10);
    
    let swimmerIndex = 1;

    for (let i = 1; i <= 5; i++) {
      // Create Coach User
      const exactCoachEmail = `coash${i}@gmail.com`;
      let userCoach = await User.findOne({ email: exactCoachEmail });
      if (!userCoach) {
        userCoach = await User.create({
          nom: `Coash`,
          prenom: `${i}`,
          email: exactCoachEmail,
          password: passwordHash,
          role: 'ENTRAINEUR',
          status: 'APPROVED',
          isActive: true
        });
      }

      let entraineur = await Entraineur.findOne({ utilisateur: userCoach._id });
      if (!entraineur) {
        entraineur = await Entraineur.create({
          utilisateur: userCoach._id,
          experience: 5,
          specialites: ['Nage Libre'],
          nageurs: []
        });
      }

      // Create 5 swimmers for this coach
      for (let j = 1; j <= 5; j++) {
        const exactSwimmerEmail = `swimmer${swimmerIndex}@gmail.com`;
        let userSwimmer = await User.findOne({ email: exactSwimmerEmail });
        if (!userSwimmer) {
          userSwimmer = await User.create({
            nom: `Swimmer`,
            prenom: `${swimmerIndex}`,
            email: exactSwimmerEmail,
            password: passwordHash,
            role: 'NAGEUR',
            status: 'APPROVED',
            isActive: true
          });
        }

        let nageur = await Nageur.findOne({ utilisateur: userSwimmer._id });
        if (!nageur) {
          nageur = await Nageur.create({
            utilisateur: userSwimmer._id,
            entraineur: entraineur._id
          });
          
          if (!entraineur.nageurs.includes(nageur._id)) {
            entraineur.nageurs.push(nageur._id);
          }
        }
        swimmerIndex++;
      }
      
      await entraineur.save();
      console.log(`Created ${exactCoachEmail} and assigned swimmers ${swimmerIndex - 5} to ${swimmerIndex - 1}.`);
    }

    console.log('Database seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seed();
