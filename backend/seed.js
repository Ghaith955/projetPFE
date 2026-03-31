const bcrypt = require('bcryptjs');
const User = require('./models/user.model');
const Nageur = require('./models/nageur.model');
const Entraineur = require('./models/entraineur.model');
const Competition = require('./models/competition.model');
const Entrainement = require('./models/entrainement.model');
const Cotisation = require('./models/cotisation.model');

async function seedAdmin() {
  try {
    // Default admin
    const adminExists = await User.findOne({ email: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      const admin = new User({
        nom: 'Admin',
        prenom: 'System',
        email: 'admin',
        password: hashedPassword,
        role: 'RESPONSABLE',
        isActive: true,
        phone: 0
      });
      await admin.save();
      console.log('🔑 Admin par défaut créé (email: admin / password: admin)');
    }

    // Seed sample data if database is empty
    const userCount = await User.countDocuments();
    if (userCount <= 1) {
      console.log('📦 Création des données de test...');

      // Entraineur users
      const entraineur1User = new User({
        nom: 'Benali',
        prenom: 'Mohamed',
        email: 'mohamed.benali@idss.tn',
        password: await bcrypt.hash('password123', 10),
        role: 'ENTRAINEUR',
        isActive: true,
        phone: 71234567
      });
      await entraineur1User.save();

      const entraineur2User = new User({
        nom: 'Trabelsi',
        prenom: 'Salma',
        email: 'salma.trabelsi@idss.tn',
        password: await bcrypt.hash('password123', 10),
        role: 'ENTRAINEUR',
        isActive: true,
        phone: 71234568
      });
      await entraineur2User.save();

      // Entraineur profiles
      const entraineur1 = new Entraineur({
        utilisateur: entraineur1User._id,
        experience: 8,
        specialites: ['Nage libre', 'Papillon'],
        certifications: [{ nom: 'Licence FINA', annee: 2020 }],
        nageurs: []
      });
      await entraineur1.save();

      const entraineur2 = new Entraineur({
        utilisateur: entraineur2User._id,
        experience: 5,
        specialites: ['Brasse', 'Dos crawlé', 'Quatre nages'],
        certifications: [{ nom: 'Brevet Fédéral', annee: 2022 }],
        nageurs: []
      });
      await entraineur2.save();

      // Nageur users
      const nageurData = [
        { nom: 'Bouazizi', prenom: 'Ahmed', email: 'ahmed.b@idss.tn', age: 19, sexe: 'Homme', poid: '72', specialite: ['Nage libre'] },
        { nom: 'Mansouri', prenom: 'Sara', email: 'sara.m@idss.tn', age: 17, sexe: 'Femme', poid: '58', specialite: ['Brasse'] },
        { nom: 'Khlifi', prenom: 'Youssef', email: 'youssef.k@idss.tn', age: 20, sexe: 'Homme', poid: '78', specialite: ['Papillon'] },
        { nom: 'Laabidi', prenom: 'Ines', email: 'ines.l@idss.tn', age: 18, sexe: 'Femme', poid: '55', specialite: ['Dos crawlé'] },
        { nom: 'Toumi', prenom: 'Karim', email: 'karim.t@idss.tn', age: 21, sexe: 'Homme', poid: '80', specialite: ['Quatre nages'] },
      ];

      for (const nd of nageurData) {
        const nageurUser = new User({
          nom: nd.nom,
          prenom: nd.prenom,
          email: nd.email,
          password: await bcrypt.hash('password123', 10),
          role: 'NAGEUR',
          isActive: true,
          phone: Math.floor(70000000 + Math.random() * 9999999)
        });
        await nageurUser.save();

        const nageur = new Nageur({
          utilisateur: nageurUser._id,
          age: nd.age,
          sexe: nd.sexe,
          poid: nd.poid,
          specialite: nd.specialite,
          entraineur: nd.specialite[0] === 'Nage libre' || nd.specialite[0] === 'Papillon' ? entraineur1._id : entraineur2._id
        });
        await nageur.save();

        // Add to entraineur's nageurs list
        if (nd.specialite[0] === 'Nage libre' || nd.specialite[0] === 'Papillon') {
          entraineur1.nageurs.push(nageur._id);
        } else {
          entraineur2.nageurs.push(nageur._id);
        }
      }

      await entraineur1.save();
      await entraineur2.save();

      // Competitions
      const competitions = [
        { nom: 'Championnat National 2026', date: new Date('2026-05-15'), lieu: 'Piscine Olympique Tunis', description: 'Championnat national de natation', niveauRequis: 'Confirmé', statut: 'À venir' },
        { nom: 'Meeting Régional Nord', date: new Date('2026-04-20'), lieu: 'Centre Aquatique Bizerte', description: 'Meeting régional zone nord', niveauRequis: 'Intermédiaire', statut: 'À venir' },
        { nom: 'Coupe de Tunisie', date: new Date('2026-06-10'), lieu: 'Piscine El Menzah', description: 'Finale coupe de Tunisie', niveauRequis: 'Expert', statut: 'À venir' }
      ];
      await Competition.insertMany(competitions);

      // Entrainements
      const entrainements = [
        { titre: 'Endurance 50m', date: new Date('2026-04-01'), heureDebut: '08:00', heureFin: '10:00', type: 'Endurance', intensite: 'Modérée', duree: 120, lieu: 'Piscine principale', entraineur: entraineur1._id, statut: 'Planifié' },
        { titre: 'Sprint Papillon', date: new Date('2026-04-02'), heureDebut: '14:00', heureFin: '16:00', type: 'Vitesse', intensite: 'Élevée', duree: 120, lieu: 'Piscine principale', entraineur: entraineur1._id, statut: 'Planifié' },
        { titre: 'Technique Brasse', date: new Date('2026-04-03'), heureDebut: '09:00', heureFin: '11:00', type: 'Technique', intensite: 'Modérée', duree: 120, lieu: 'Piscine secondaire', entraineur: entraineur2._id, statut: 'Planifié' },
      ];
      await Entrainement.insertMany(entrainements);

      console.log('✅ Données de test créées avec succès !');
    }
  } catch (error) {
    console.error('❌ Erreur seed:', error);
  }
}

module.exports = seedAdmin;
