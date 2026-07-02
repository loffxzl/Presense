import { success } from 'zod';
import * as profileService from '../../services/profileService.js';

export const getProfilePage = async (req,res) => {
    try{
        res.render('user/profile', {
            title: 'My Profile',
            user: req.user,
            error:null,
            success:null
        })
    }catch(err){
        console.error('getProfile error: ',err.message);
        res.status(500).send('Server error');
    }
};

export const updateProfile = async (req,res) => {
    try{
        const updatedUser = await profileService.updateProfile(req.user._id, req.body);
        res.render('user/profile', {
            title:'My profile',
            user:updatedUser,
            error:null,
            success:'Profile updated successfully'
        });
    }catch(err){
        res.render('user/profile', {
            title: 'My profile',
            user: req.user,
            error:err.message,
            success:null,
        });
    }
};

export const changePassword = async (req,res) => {
    try{
        await profileService.changePassword(req.user._id, req.body);
        res.render('user/profile', {
            title:'My Profile',
            user:req.user,
            error:null,
            success:'Password changed successfully'
        })
    }catch(err){
        res.render('user/profile', {
            title: 'My Profile',
            user:req.user,
            error:err.message,
            success:null
        });
    }
};