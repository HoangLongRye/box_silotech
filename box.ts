declare var require: any
const fs = require("fs");
import { HmacSHA256, enc } from "crypto-js";
import Decimal from "decimal.js";
import { randomBytes } from "crypto";

const golden_init_prob:number[]= [0.0001,
    0.00016,
    0.00018,
    0.0004,
    0.0008,
    0.002,
    0.03,
    0.07,
    0.105,
    0.2,
    0.24,
    0.35136]
const plat_init_prob:number[]= [0.0005,
    0.00064,
    0.00072,
    0.0016,
    0.0024,
    0.0035,
    0.04,
    0.09,
    0.12,
    0.20,
    0.23,
    0.31064]

const dia_init_prob:number[]= [0.001,
    0.0013,
    0.0015,
    0.0035,
    0.005,
    0.006,
    0.05,
    0.1,
    0.14,
    0.2,
    0.23,
    0.2617]
const items: string[] = ['Paranium',
    'Pythium',
    'Crypton',
    'Onixius',
    'Gem',
    'Metal',
    'Crystal',
    'Plastic',
    'Rubber',
    'Wood',
    'Stone',
    'Soil'];

const g_weight=[1, 2, 3, 4, 5, 5, 5, 5, 5, 5, 5, 5];
const p_weight=[1, 2, 3, 4, 5, 5, 5, 5, 10, 10, 15, 5];
const d_weight=[1, 2, 3, 4, 5, 5, 10, 10, 15, 15, 25, 5];

//generate seed
const seedGenerator = (address: string, unbox_blockhash: string, boxId: number, n: number = 0, turn: number=0): string => {
    if (turn < 0 || turn > 2) throw new Error(`turn must be 0|1|2`)
    const hmac = HmacSHA256(`${address}:${unbox_blockhash}:${boxId}:${turn.toString()}`, n.toString());
    return hmac.toString(enc.Hex);
}

//generate box quantity n1,n2,n3
const getQuantityBox = (address: string, unbox_blockhash: string, boxId: number, box_type: number): number[] => {
    if (box_type < 0 || box_type > 2 || typeof box_type !== 'number' || !Number.isInteger(box_type)) throw new Error(`box_type must be 0|1|2`)    
    const quantity_max = box_type === 0 ? 50 : (box_type === 1 ? 70 : 100)
    const results: number[] = []
    let max_mod_arr:number[]=[quantity_max-20-10*box_type-1]; // 30 40 60
    let bound_number_arr :number[]=[40,60,70]; 
    let turn = 0 //turn
    let n = 0

    while (turn >= 0 && turn <= 2) {
        const seed = seedGenerator(address, unbox_blockhash, boxId, n, turn)
        if(turn==1){
            max_mod_arr.push(bound_number_arr[box_type] - results[0]); // 10 10 10
        }
        else if(turn==2){
            max_mod_arr.push(quantity_max-results[0]-results[1]); // 10 20 30
            
            
        }
        const max_mod = max_mod_arr[turn];
        n = new Decimal(`0x` + seed).mod(max_mod).toNumber() +1;
        n = n === 0 ? 1 : n
        results.push(n)
       
        turn += 1
    }
    return results
}


//get random number from 1 to 100.000
function randomInt(address: string, unbox_blockhash: string, boxId: number, turn: number) {
    let rd_seed = seedGenerator(address, unbox_blockhash, boxId, turn);
    const rd_max = 100001;
    let rd_num = new Decimal(`0x` + rd_seed).mod(rd_max).toNumber() ;
    return rd_num;
}

// result dynamic runes
function selectRunes(items: string[], percentage: number[],address: string, unbox_blockhash: string, boxId: number, turn: number): string {
    let rdNumber: number = randomInt(address, unbox_blockhash, boxId, turn) / 100000;
    let w: number[] = percentage;
    for (let j = 1; j < 11; j++)
        w[j] = w[j - 1] + percentage[j];
    let i = 0;
    w[11] = 1;
    for (i; i < w.length; i++)
        if (w[i] >= rdNumber)
            break;

    return items[i];
}

// Generate dynamic probs + return Items
function getBoxItem(n: number, address: string, unbox_blockhash: string, boxId: number, turn: number, box_type: number): string {
    
    let box_weight: number[],init_prob: number[],results: number[];
    if (box_type == 0) {
        results = [0.0001,
            0.00016,
            0.00018,
            0.0004,
            0.0008,
            0.002,
            0.03,
            0.07,
            0.105,
            0.2,
            0.24,
            0.35136];
        box_weight = g_weight;
        init_prob=golden_init_prob;

    }
    else if (box_type == 1) {
        results = [0.0005,
            0.00064,
            0.00072,
            0.0016,
            0.0024,
            0.0035,
            0.04,
            0.09,
            0.12,
            0.20,
            0.23,
            0.31064];
        box_weight = p_weight;
        init_prob=plat_init_prob;
    } else {
        results = [0.001,
            0.0013,
            0.0015,
            0.0035,
            0.005,
            0.006,
            0.05,
            0.1,
            0.14,
            0.2,
            0.23,
            0.2617];
        box_weight = d_weight;
        init_prob=dia_init_prob;
    }
    
    if (n == 1) {


        return selectRunes(items, results,address,unbox_blockhash, boxId, turn);
    }
    else if (n > 1) {

        let cum_sum = 0;
        for (let i = 0; i < box_weight.length; i++) {
            cum_sum = cum_sum + box_weight[i];
            let cum_probs = 0;
            let multi_probs = 0;
            var remain_w = 0;
            if (cum_sum - box_weight[i] < n && n <= cum_sum) {
                if (i == box_weight.length - 1) remain_w == 0;
                else remain_w = cum_sum - n;
                for (let j = 0; j < box_weight.length; j++) {
                    if (j < i) {
                        cum_probs = Math.max(...results.slice(0, j));
                        results[j] = 0;
                    } else if (j == i && i< box_weight.length-1) {
                        if (remain_w == 0) {
                            multi_probs = Math.max(...results.slice(0, j));
                            results[j] = 0;
                        } else {
                            
                            multi_probs =(init_prob[j]-cum_probs)*(box_weight[i]-remain_w)/box_weight[i]+cum_probs
                            
                            results[j] = results[j] - multi_probs
                        }
                    } else if (i < j && j < 11) {
                        results[j] = results[j] - multi_probs;
                    } else {
                        results[j] = 1 - results.slice(0, 10).reduce((a, b) => a + b, 0) ;
                    }
                }
            }
        }
    } else {
        throw new Error(`invalid number`);
    
    }

    return selectRunes(items, results,address,unbox_blockhash, boxId, turn);
}








function openBox(address: string, unbox_blockhash: string, boxId: number, box_type: number) {
    let item_rs:number[]=new Array(12).fill(0)
    
    let s1: string, s2: string, s3: string, box: string, arr_n: number[];
    if (box_type == 0) {
        box = 'Golden'
        arr_n = getQuantityBox(address, unbox_blockhash, boxId, box_type)


        s1 = getBoxItem(arr_n[0], address,unbox_blockhash, boxId, 1, box_type);

        s2 = getBoxItem(arr_n[1], address,unbox_blockhash, boxId, 2, box_type);

        s3 = getBoxItem(arr_n[2], address,unbox_blockhash, boxId, 3, box_type);


    } else if (box_type == 1) {
        box = 'Platinum'
        arr_n = getQuantityBox(address, unbox_blockhash, boxId, box_type)


        s1 = getBoxItem(arr_n[0], address,unbox_blockhash, boxId, 1, box_type);

        s2 = getBoxItem(arr_n[1], address,unbox_blockhash, boxId, 2, box_type);

        s3 = getBoxItem(arr_n[2], address,unbox_blockhash, boxId, 3, box_type);

    } else {
        box = 'Diamond'
        arr_n = getQuantityBox(address, unbox_blockhash, boxId, box_type)


        s1 = getBoxItem(arr_n[0], address,unbox_blockhash, boxId, 1, box_type);

        s2 = getBoxItem(arr_n[1], address,unbox_blockhash, boxId, 2, box_type);

        s3 = getBoxItem(arr_n[2], address,unbox_blockhash, boxId, 3, box_type);

    }
    return {'boxId':boxId, 'box_name': box, 'n1': arr_n[0], 'n1_result': s1, 'n2': arr_n[1], 'n2_result': s2, 'n3': arr_n[2], 'n3_result': s3 };
}


const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
    path: 'total2.csv',
    header: [
        { id: 'boxId', title: 'boxId' },
        { id: 'box_name', title: 'box_name' },
        { id: 'n1', title: 'n1' },
        { id: 'n1_result', title: 'n1_result' },
        { id: 'n2', title: 'n2' },
        { id: 'n2_result', title: 'n2_result' },
        { id: 'n3', title: 'n3' },
        { id: 'n3_result', title: 'n3_result' }
    ]
});

var rs_array: any[] = [];
for (let i = 8500; i < 10000 ; i++) {
    const address = `0x${randomBytes(20).toString('hex')}`
    const unbox_blockhash = `0x${randomBytes(32).toString('hex')}`
    rs_array.push(openBox(address, unbox_blockhash, i, 2));
}


csvWriter
    .writeRecords(rs_array)
    .then(() => console.log('The CSV file was written successfully'));






