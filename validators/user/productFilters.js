import {escapeRegex} from '../../utils/escapeRegex.js';

export const ProductFilter = ({ search, categoryId, minPrice, maxPrice,status = "active"} = {})=>{
    const filter = {isDeleted:{$ne:true}};
    if(status) filter.status = status
    if(categoryId) filter.categoryId = categoryId;
    if(search?.trim()) filter.name = { $regex: escapeRegex(search.trim()), $options: 'i' }
    // if(minPrice && maxPrice) filter['varients.salePrice'] = {$gte:minPrice,$lte:maxPrice}
    if(minPrice || maxPrice){
        filter['varients.salePrice'] = {};
        if(minPrice) filter['varients.salePrice'].$gte = Number(minPrice);
        if(maxPrice) filter['varients.salePrice'].$lte = Number(maxPrice);
    };

    return filter;
};

export const SORT_OPTIONS = {
    lowTohigh: {"varients.salePrice":1},
    highTolow: {"varients.salePrice":-1},
    "a-z": {name:1},
    "z-a":{name:-1},
    newest:{createdAt:-1}
};
