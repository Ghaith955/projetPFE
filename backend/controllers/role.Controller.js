const Role=require('../models/role.model');
const User=require('../models/user.model');
const {sendMail}=require('../utils/sendEmail');


const roleController={};

roleController.createRole=async(req , res)=>{
    try{
        const{nom, description}=req.body;

        const existingRole=await Role.findOne({nom});
        if(existingRole){
            return res.status(400).json({message: "Role existe déja"})
        }
        const newRole= new Role({nom, description});
        await newRole.save();
        res.status(201).json({message:"Role crée avec succes !"})
    }catch(error){
        res.status(500).json({message:"Erreur lors de creation de role"});
    }
    
};
roleController.assignRoleToUser = async (req, res) => {
    try {
        const { userId, roleId } = req.body;

        if (!userId || !roleId) {
            return res.status(400).json({ message: "userId et roleId sont requis." });
        }

        // Vérifier si l'utilisateur existe ou nn
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        // Vérifier si le rôle existe
        const role = await Role.findById(roleId);
        if (!role) {
            return res.status(404).json({ message: "Rôle non trouvé." });
        }

        user.role = roleId;
        user.isActive = true;  // Activer le compte une fois le rôle assigné
        await user.save();

        const subject='Votre rôle a été mis à jour';
        const content=`
        <p>Bonjour ${user.prenom} ${user.nom},</p>
        <p>Votre rôle a été mis à jour avec succès. Vous êtes désormais ${role.nom}. et votre compte sera activé</p>
        <p>Cordialement,<br>Centre juridique Tunisair</p>
        `
        sendMail(user.email, subject, content, true);

        res.status(200).json({
            message: "Rôle assigné avec succès et compte activé.",
            user: {
                id: user._id,
                nom: user.nom,
                prenom: user.prenom,
                email: user.email,
                role: role.nom, 
                isActive: user.isActive 
            }
        });

    } catch (error) {
        console.error("Erreur lors de l'assignation du rôle:", error);  // Pour déboguer
        res.status(500).json({ message: "Erreur lors de l'assignation." });
    }
};

roleController.getAllRoles=async(req,res)=>{
    try{
        const roles= await Role.find();
        res.status(200).json(roles);
    }catch(error){
        console.log('erreur lors de la récupuration des roles:',error.message);
        res.status(500).json({message:'Erreur serveur lors de la récupuration des roles'});
    }
};
roleController.deleteRole=async(req,res)=>{
    try{
        const roleId= req.params.id;
        const deleteRole= await Role.findByIdAndDelete(roleId);
        if(!deleteRole){
            return res.status(404).json({message:'Role non trouvé'});
        }
        res.status(200).json({message:'role supprimé aver succes'});

        }catch (error){
            console.log('erreur lors de la suppresiion de role',error);
            res.status(500).json({message:'erreur serveur'});

        }
    };
    roleController.updateRole=async(req,res)=>{
        try{
            const roleId= req.params.id;
            const {nom , description}= req.body;
            const updateRole= await Role.findByIdAndUpdate(roleId,{nom, description},{new: true});
            if(!updateRole){
                return res.status(404).json({message:'Role non trouver'});
            }
            res.status(200).json({message:'updateRole'});
        }catch (error){
            cosnole.log('Erreur lors de la modification de role',error);
            res.status(500).json({message:'erreur serveur'});
        }
    };
roleController.updateRole=async(req,res)=>{
        try{
            const roleId= req.params.id;
            const {nom , description}= req.body;
            const updateRole= await Role.findByIdAndUpdate(roleId,{nom, description},{new: true});
            if(!updateRole){
                return res.status(404).json({message:'Role non trouver'});
            }
            res.status(200).json({message:'updateRole'});
        }catch (error){
            cosnole.log('Erreur lors de la modification de role',error);
            res.status(500).json({message:'erreur serveur'});
        }
    };
    
    


module.exports=roleController;