import * as userService from '../../services/userService.js'

export const getUserList = async (req, res) => {
  try {
    const { page = 1, search = '' } = req.query;
    const data = await userService.getUserList({ page, limit: 10, search });
    res.render('admin/users', {
      ...data,
      title: 'User Management',
      adminName: req.session.admin.name  // pass it explicitly
    });
  } catch (err) {
    console.error('getUserList error: ', err.message);
    res.status(500).send('Server error');
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    await userService.toggleUserStatus(id);
    const { search = '', page = 1 } = req.body;
    res.redirect(`/admin/users?page=${page}&search=${search}`);
  } catch (err) {
    console.error('toggleUserStatus error:', err.message);
    res.status(500).send('Server error');
  }
};