
import User from "../models/User.js";


export default class UserService {

    async getDoctorsByClinic(clinicId,role, searchQuery = "") {

        console.log(clinicId , searchQuery);
        
        try {

            // Base filter
            // let filter = {   
            //     clinicId: clinicId,
            //     role: "DOCTOR"
            // };

  

               if (!searchQuery || searchQuery.trim() === "") {
            return { result: [], code: 200 };  
        }


   const q = new RegExp(searchQuery.trim(), "i"); // case-insensitive regex

        // Search filter
        const filter = {
            clinicId,
            role: role,
            $or: [
                { firstName: q },
                { middleName: q },
                { lastName: q },
                { username: q }
            ]
        };

            const data = await User.find(filter)
                .select({
                    firstName: 1,
                    middleName: 1,
                    lastName: 1,
                    cellPhoneNumber: 1,
                    dob: 1,
                    userId: 1,
                    gender: 1,
                    email: 1,
                    username:1,
                    _id: 0
                });

            return { result: data, code: 200 };

        } catch (err) {
            return { error: err.message, code: 500 };
        }
    }


    async getUserById(userId) {
        try {
            const user = await User.findOne({ userId: userId })
                .select({
                    firstName: 1,
                    middleName: 1,
                    lastName: 1,
                    cellPhoneNumber: 1,
                    dob: 1,
                    userId: 1,
                    gender: 1,
                    email: 1,
                    username:1,
                    _id: 0
                });        
                
            return { result: user, code: 200 };
}
     catch (err) {
            return { error: err.message, code: 500 };
        }}


    }
