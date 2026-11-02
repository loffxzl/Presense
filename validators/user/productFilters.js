import {escapeRegex} from '../../utils/escapeRegex.js';

export const ProductFilter = ({ search, categoryId, minPrice, maxPrice,status = "active"} = {})=>{
const filter = {isDeleted:{$ne:true}};
if(status) filter.status = status
if(categoryId) filter.categoryId = categoryId;
if(search?.trim()) filter.name = { $regex: escapeRegex(search.trim()), $options: 'i' }
if(minPrice || maxPrice){
filter['varients.salePrice'] = {};
if(minPrice) filter['varients.salePrice'].$gte = Number(minPrice);
if(maxPrice) filter['varients.salePrice'].$lte = Number(maxPrice);
};

return filter;
};


export const PRICE_SORT_DIRECTIONS = {
lowTohigh: 1,
highTolow: -1
};

export const SORT_OPTIONS = {
"a-z": {name:1},
"z-a":{name:-1},
newest:{createdAt:-1}
};