// Create a sheet with projection of costs registereds at Organizze.
// https://github.com/organizze/api-doc

const username = ''; // E-mail account used to login
const password = ''; // Organizze account API key 
const url = 'https://api.organizze.com.br/rest/v2';

const days_at_month = [31,28,31,30,31,30,31,31,30,31,30,31];
const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const date = new Date();

let app = SpreadsheetApp;
let ui = app.getUi();
let categories_sheet = app.getActiveSpreadsheet().getSheetByName("Categories");
let transactions_seet = app.getActiveSpreadsheet().getSheetByName("Transactions");

function myFunction() {
  const current_year = `${date.getFullYear()}`;
  let current_year_sheet = app.getActiveSpreadsheet().getSheetByName(current_year);

  updateAllYearValues(current_year_sheet);
}

const clearTable = (sheet) => {
  const categories_rows = getCategoriesRows(sheet);
  const month_columns = getMonthColumns(sheet);

  for(let i = 0; i<12; i++) {
    for(category in categories_rows) {
      for(row in categories_rows[category]) {
        sheet.getRange(categories_rows[category][row], month_columns[months[i]]).setValue(0);
      }
    }
  }
}

const getTableUpdated = () => {
  const current_year = `${date.getFullYear()}`;
  let current_year_sheet = app.getActiveSpreadsheet().getSheetByName(current_year);

  clearTable(current_year_sheet);

  updateAllYearValues(current_year_sheet);  
  return; 
}

const statusAplication = () => {
  ui.alert("Its working!");
}

const getAtributesAtBeggining = (sheet, value) => {
  let column = 1;
  let row = 1;

  while(row < 10) {
    while(column < 10) {
      if (sheet.getRange(row,column).getValue() == value) return {row, column};
      column++;
    }
    row++;
  }

  return {row: -1,column: -1}
}

const getCategoriesRows = (sheet) => {
  let {row, column} = getAtributesAtBeggining(sheet, 'category_id');
  if(row < 0 || column < 0) return; // Validação de erro

  let categories = {};

  row++;
  while (sheet.getRange(row,column).getValue() == 0) row++;
  let empty_cell_count = 0;
  let default_flag = 0;
  while (empty_cell_count < 3) {
    if(sheet.getRange(row,column+1).getValue() == 0) {
      empty_cell_count++;
      default_flag = 0;
    } else if (default_flag == 0 && sheet.getRange(row,column).getValue() == 0) {
      // do nothing
    } else if (default_flag == 0) {
      categories[sheet.getRange(row,column).getValue().toString()] = {'default': row};

      empty_cell_count = 0;
      default_flag++;
    } else {
      categories[sheet.getRange(row - default_flag,column).getValue().toString()][sheet.getRange(row,column+1).getValue().toString()] = row;
      
      empty_cell_count = 0;
      default_flag++;
    }
    row++;
  }

  // categories = {'111111': {defaul: 1, "Desc1": 2, "Desc2": 3}}
  return categories;
}

const getMonthColumns = (sheet) => {
  let {row, column} = getAtributesAtBeggining(sheet, 'jan');
  if(row < 0 || column < 0) return; // Validação de erro

  let month_columns = {};

  while (sheet.getRange(row, column).getValue() == 0) column++;
  let empty_cell_count = 0;
  while (empty_cell_count < 3) {
    if(sheet.getRange(row, column).getValue() == 0) {
      empty_cell_count++;
    } else {
      month_columns[sheet.getRange(row, column).getValue().toString()] = column;
      empty_cell_count = 0;
    }
    column++;
  } 
  return month_columns;
}

const getValues = (sheet, all_transactions) => {
  const categories_rows = getCategoriesRows(sheet);
  const month_columns = getMonthColumns(sheet);

  let cells = {}

  for(let i = 0; i < all_transactions.length; i++) {
    let transactions = all_transactions[i];
    const month = i + ( 12 - all_transactions.length );
    const col = month_columns[months[month]]

    for(let j=0; j < transactions.length; j++) {
      
      try {
        if(transactions[j].description in categories_rows[transactions[j].category_id]) {        
          if(cells[col] == null) cells[col] = {};
          if(cells[col][categories_rows[transactions[j].category_id][transactions[j].description]] == null)
            cells[col][categories_rows[transactions[j].category_id][transactions[j].description]] = 0;
          cells[col][categories_rows[transactions[j].category_id][transactions[j].description]] += transactions[j].amount_cents;
          
        } else {
          if(cells[col] == null) cells[col] = {};
          if(cells[col][categories_rows[transactions[j].category_id]['default']] == null) 
            cells[col][categories_rows[transactions[j].category_id]['default']] = 0.0;
          cells[col][categories_rows[transactions[j].category_id]['default']] += transactions[j].amount_cents;
        }   
      } catch {
        Logger.log(transactions[j].category_id);
        Logger.log(`${transactions[j].description}`);
        Logger.log(categories_rows);
      }
    }
  }

  return cells;
}

const updateCells = (sheet, cells) => {
  for(let column in cells) {
    for(let row in cells[column]) {
      sheet.getRange(row, column).setValue(cells[column][row]/100);
    }
  }
  return;
}

const updateYearNewValues =  (sheet) => {
  ui.alert('Wait! Updating the table');
  const transactions = getYearTransactions(date.getMonth(), 12);
  
  const cells = getValues(sheet, transactions);
  updateCells(sheet, cells);

  ui.alert("Successful update!");
  return; 
}

const updateAllYearValues = (sheet) => {
  ui.alert('Wait! Updating the table.');
  const year_transactions = getYearTransactions(1, 12);

  const cells = getValues(sheet, year_transactions);
  updateCells(sheet, cells);

  ui.alert("Successful update!");
  return; 
}

const getCategories = () => {
  const response = UrlFetchApp.fetch(url + '/categories',{
  method: 'GET',
  headers: {
    'Authorization': 'Basic ' + Utilities.base64Encode(username + ":" + password),
    'User-Agent': 'Pedro Henrique (phdosilva@gmail.com)'
    }
  });
  const my_json = response.getContentText();
  return JSON.parse(my_json); 
}
const getCategoriesByTable = () => {}

const getTransaction = (start_date = '', end_date = '') => {
  let url_transaction = '';
  if (start_date != '' && end_date != '') {
    url_transaction = `${url}/transactions/?start_date=${start_date}&end_date=${end_date}`;
  } else {
    url_transaction = `${url}/transactions/`
  }

  const response = UrlFetchApp.fetch(url_transaction,{
    
  method: 'GET',
  headers: {
    'Authorization': 'Basic ' + Utilities.base64Encode(username + ":" + password),
    'User-Agent': 'Pedro Henrique (phdosilva@gmail.com)'
    }
  });
  const my_json = response.getContentText();
  return JSON.parse(my_json);
}
const getTransactionByTable = () => {} 

const formatDate = (day, month, year) => `${year}-${month}-${day}`;

const getYearTransactions = (start_month, end_month) => {
  const days_at_month = [31,28,31,30,31,30,31,31,30,31,30,31];
  let transactions = [];

  for(let i = start_month-1; i < end_month; i++) {
    const start_date = formatDate(1,i+1,date.getFullYear());
    const end_date = formatDate(days_at_month[i],i+1,date.getFullYear());
    // Logger.log('initialDate :' + start_date + ' && finalDate :' + end_date);
    transactions.push(getTransaction(start_date, end_date));
  }
  return transactions;
}

// handle with other tables

const createCategoriesTable = () => {
  const categories = getCategories();
  
  for(let i=0; i<categories.length; i++) {
    categories_sheet.getRange(i+2,1).setValue(categories[i].id);
    categories_sheet.getRange(i+2,2).setValue(categories[i].name);
    categories_sheet.getRange(i+2,3).setValue(categories[i].color);
    categories_sheet.getRange(i+2,4).setValue(categories[i].parent_id);
    categories_sheet.getRange(i+2,1).setBackground('#'+ categories[i].color);
    categories_sheet.getRange(i+2,2).setBackground('#'+ categories[i].color);
    categories_sheet.getRange(i+2,3).setBackground('#'+ categories[i].color);
    categories_sheet.getRange(i+2,4).setBackground('#'+ categories[i].color);
  }

  ui.alert("Categorys table updated!");
}

const updateTransactionsTable = () => {
  const year_transactions = getYearTransactions(1, 12);
  year_transactions.map(createTransactionsTable);  
  ui.alert("Transactions table updated!");
}

const creathTransactionsTable = (transactions, i) => {
  transactions_seet.getRange(1,i*5+1).setValue(months[i]);
  transactions_seet.getRange(2,i*5+1).setValue('date');
  transactions_seet.getRange(2,i*5+2).setValue('name');
  transactions_seet.getRange(2,i*5+3).setValue('category_id');
  transactions_seet.getRange(2,i*5+4).setValue('amount_cents');

  for(let j = 0; j < transactions.length; j++) {
    transactions_seet.getRange(j+3,i*5+1).setValue(transactions[j].date);
    transactions_seet.getRange(j+3,i*5+2).setValue(transactions[j].description);
    transactions_seet.getRange(j+3,i*5+3).setValue(transactions[j].category_id);
    transactions_seet.getRange(j+3,i*5+4).setValue(transactions[j].amount_cents);
  }
}


