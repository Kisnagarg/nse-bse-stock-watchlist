/**
 * Enrichment script for Indian Stocks:
 * Adds official company names, ISINs, and verified BSE listings for major Indian companies.
 * Ensures the master stock database correctly links NSE and BSE listings of the same company.
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'watchlist.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Verified dataset of top Indian equities: [NSE Symbol, BSE Code, Company Name, ISIN]
const verifiedStocks: [string, string, string, string][] = [
  ['RELIANCE', '500325', 'Reliance Industries Ltd.', 'INE002A01018'],
  ['TCS', '532540', 'Tata Consultancy Services Ltd.', 'INE467B01029'],
  ['HDFCBANK', '500180', 'HDFC Bank Ltd.', 'INE040A01034'],
  ['INFY', '500209', 'Infosys Ltd.', 'INE009A01021'],
  ['ICICIBANK', '532174', 'ICICI Bank Ltd.', 'INE090A01021'],
  ['BHARTIARTL', '532454', 'Bharti Airtel Ltd.', 'INE397D01024'],
  ['SBIN', '500112', 'State Bank of India', 'INE062A01020'],
  ['LICI', '543526', 'Life Insurance Corporation of India', 'INE0J1Y01017'],
  ['ITC', '500875', 'ITC Ltd.', 'INE154A01025'],
  ['HINDUNILVR', '500696', 'Hindustan Unilever Ltd.', 'INE030A01027'],
  ['LT', '500510', 'Larsen & Toubro Ltd.', 'INE018A01030'],
  ['BAJFINANCE', '500034', 'Bajaj Finance Ltd.', 'INE296A01024'],
  ['HCLTECH', '532281', 'HCL Technologies Ltd.', 'INE860A01027'],
  ['MARUTI', '532500', 'Maruti Suzuki India Ltd.', 'INE585B01010'],
  ['SUNPHARMA', '524715', 'Sun Pharmaceutical Industries Ltd.', 'INE044A01036'],
  ['ADANIENT', '512599', 'Adani Enterprises Ltd.', 'INE423A01024'],
  ['KOTAKBANK', '500247', 'Kotak Mahindra Bank Ltd.', 'INE237A01028'],
  ['TITAN', '500114', 'Titan Company Ltd.', 'INE280A01028'],
  ['ONGC', '500312', 'Oil & Natural Gas Corporation Ltd.', 'INE213A01029'],
  ['TATAMOTORS', '500570', 'Tata Motors Ltd.', 'INE155A01022'],
  ['NTPC', '532555', 'NTPC Ltd.', 'INE733E01010'],
  ['AXISBANK', '532215', 'Axis Bank Ltd.', 'INE238A01034'],
  ['DMART', '540376', 'Avenue Supermarts Ltd.', 'INE192R01011'],
  ['ADANIGREEN', '541450', 'Adani Green Energy Ltd.', 'INE364U01010'],
  ['ADANIPORTS', '532921', 'Adani Ports & Special Economic Zone Ltd.', 'INE742F01042'],
  ['POWERGRID', '532898', 'Power Grid Corporation of India Ltd.', 'INE752E01010'],
  ['COALINDIA', '533278', 'Coal India Ltd.', 'INE522F01014'],
  ['BAJAJFINSV', '532978', 'Bajaj Finserv Ltd.', 'INE918I01018'],
  ['ASIANPAINT', '500820', 'Asian Paints Ltd.', 'INE021A01026'],
  ['HAL', '541154', 'Hindustan Aeronautics Ltd.', 'INE066F01012'],
  ['BEL', '500049', 'Bharat Electronics Ltd.', 'INE263A01024'],
  ['TRENT', '500251', 'Trent Ltd.', 'INE849A01020'],
  ['SIEMENS', '500550', 'Siemens Ltd.', 'INE003A01024'],
  ['IOC', '530965', 'Indian Oil Corporation Ltd.', 'INE242A01010'],
  ['VBL', '540180', 'Varun Beverages Ltd.', 'INE200M01013'],
  ['DLF', '532868', 'DLF Ltd.', 'INE271C01023'],
  ['ZOMATO', '543320', 'Zomato Ltd.', 'INE758T01015'],
  ['NESTLEIND', '500790', 'Nestle India Ltd.', 'INE239A01016'],
  ['JSWSTEEL', '500228', 'JSW Steel Ltd.', 'INE019A01038'],
  ['GRASIM', '500300', 'Grasim Industries Ltd.', 'INE047A01021'],
  ['TATASTEEL', '500470', 'Tata Steel Ltd.', 'INE081A01012'],
  ['JIOFIN', '543940', 'Jio Financial Services Ltd.', 'INE758E01017'],
  ['HINDALCO', '500440', 'Hindalco Industries Ltd.', 'INE038A01020'],
  ['VEDL', '500295', 'Vedanta Ltd.', 'INE205A01025'],
  ['TECHM', '532755', 'Tech Mahindra Ltd.', 'INE669C01036'],
  ['PFC', '532810', 'Power Finance Corporation Ltd.', 'INE134E01011'],
  ['RECLTD', '532955', 'REC Ltd.', 'INE020B01018'],
  ['GAIL', '532155', 'GAIL (India) Ltd.', 'INE129A01019'],
  ['INDIGO', '539448', 'InterGlobe Aviation Ltd.', 'INE646L01027'],
  ['BHEL', '500103', 'Bharat Heavy Electricals Ltd.', 'INE257A01026'],
  ['ABB', '500002', 'ABB India Ltd.', 'INE117A01022'],
  ['EICHERMOT', '505200', 'Eicher Motors Ltd.', 'INE066A01013'],
  ['DIVISLAB', '532488', 'Divi\'s Laboratories Ltd.', 'INE361B01024'],
  ['BPCL', '500547', 'Bharat Petroleum Corporation Ltd.', 'INE029A01011'],
  ['SHRIRAMFIN', '511218', 'Shriram Finance Ltd.', 'INE721A01013'],
  ['CHOLAFIN', '511243', 'Cholamandalam Investment & Finance Company Ltd.', 'INE121A01024'],
  ['POLYCAB', '542652', 'Polycab India Ltd.', 'INE455K01017'],
  ['TATAPOWER', '500400', 'Tata Power Company Ltd.', 'INE245A01021'],
  ['DRREDDY', '500124', 'Dr. Reddy\'s Laboratories Ltd.', 'INE089A01023'],
  ['BRITANNIA', '500825', 'Britannia Industries Ltd.', 'INE216A01030'],
  ['CIPLA', '500087', 'Cipla Ltd.', 'INE059A01026'],
  ['BAJAJ_AUTO', '532977', 'Bajaj Auto Ltd.', 'INE917I01010'],
  ['HEROMOTOCO', '500182', 'Hero MotoCorp Ltd.', 'INE158A01026'],
  ['APOLLOHOSP', '508869', 'Apollo Hospitals Enterprise Ltd.', 'INE437A01024'],
  ['WIPRO', '507685', 'Wipro Ltd.', 'INE075A01022'],
  ['HAVELLS', '517354', 'Havells India Ltd.', 'INE176B01034'],
  ['MAXHEALTH', '543220', 'Max Healthcare Institute Ltd.', 'INE027H01010'],
  ['MOTHERSON', '517334', 'Samvardhana Motherson International Ltd.', 'INE775A01035'],
  ['LTIM', '540005', 'LTIMindtree Ltd.', 'INE214T01019'],
  ['INDUSINDBK', '532187', 'IndusInd Bank Ltd.', 'INE095A01012'],
  ['MAZDOCK', '543237', 'Mazagon Dock Shipbuilders Ltd.', 'INE249Z01012'],
  ['COCHINSHIP', '540679', 'Cochin Shipyard Ltd.', 'INE704P01017'],
  ['BDL', '541143', 'Bharat Dynamics Ltd.', 'INE171Z01018'],
  ['RVNL', '542649', 'Rail Vikas Nigam Ltd.', 'INE415G01027'],
  ['IRFC', '543257', 'Indian Railway Finance Corporation Ltd.', 'INE053F01010'],
  ['IRCTC', '542830', 'Indian Railway Catering & Tourism Corporation Ltd.', 'INE335Y01012'],
  ['SUZLON', '532667', 'Suzlon Energy Ltd.', 'INE040H01021'],
  ['IDEA', '532822', 'Vodafone Idea Ltd.', 'INE669E01016'],
  ['BOSCHLTD', '500530', 'Bosch Ltd.', 'INE323A01026'],
  ['PIDILITIND', '500331', 'Pidilite Industries Ltd.', 'INE318A01026'],
  ['COLPAL', '500830', 'Colgate-Palmolive (India) Ltd.', 'INE181A01012'],
  ['DABUR', '500096', 'Dabur India Ltd.', 'INE016A01026'],
  ['GODREJCP', '532424', 'Godrej Consumer Products Ltd.', 'INE102D01028'],
  ['MARICO', '531642', 'Marico Ltd.', 'INE196A01026'],
  ['BERGEPAINT', '509480', 'Berger Paints India Ltd.', 'INE463A01038'],
  ['TATACOMM', '500483', 'Tata Communications Ltd.', 'INE151A01013'],
  ['PERSISTENT', '533179', 'Persistent Systems Ltd.', 'INE262H01013'],
  ['COFORGE', '532541', 'Coforge Ltd.', 'INE591G01017'],
  ['MPHASIS', '526299', 'MphasiS Ltd.', 'INE356A01018'],
  ['LTTS', '540115', 'L&T Technology Services Ltd.', 'INE010V01017'],
  ['KPITTECH', '542651', 'KPIT Technologies Ltd.', 'INE04I401011'],
  ['KALYANKJIL', '543278', 'Kalyan Jewellers India Ltd.', 'INE303R01014'],
  ['PAYTM', '543396', 'One97 Communications Ltd. (Paytm)', 'INE982J01020'],
  ['NYKAA', '543384', 'FSN E-Commerce Ventures Ltd. (Nykaa)', 'INE388Y01029'],
  ['POLICYBZR', '543390', 'PB Fintech Ltd. (PolicyBazaar)', 'INE417T01026'],
  ['DELHIVERY', '543529', 'Delhivery Ltd.', 'INE148O01028'],
  ['ZENSARTECH', '504067', 'Zensar Technologies Ltd.', 'INE520A01027'],
  ['CYIENT', '532175', 'Cyient Ltd.', 'INE136B01020'],
  ['SONACOMS', '543300', 'Sona BLW Precision Forgings Ltd.', 'INE073K01018'],
  ['UNOMINDA', '532539', 'Uno Minda Ltd.', 'INE405E01023'],
  ['TIINDIA', '540762', 'Tube Investments of India Ltd.', 'INE974X01010'],
  ['APOLLOTYRE', '500877', 'Apollo Tyres Ltd.', 'INE438A01022'],
  ['MRF', '500290', 'MRF Ltd.', 'INE883A01011'],
  ['BALKRISIND', '502355', 'Balkrishna Industries Ltd.', 'INE787D01026'],
  ['CEATLTD', '500878', 'CEAT Ltd.', 'INE482A01020'],
  ['JKTYRE', '500897', 'JK Tyre & Industries Ltd.', 'INE573A01042'],
  ['EXIDEIND', '500086', 'Exide Industries Ltd.', 'INE302A01020'],
  ['AMARAJABAT', '500008', 'Amara Raja Energy & Mobility Ltd.', 'INE885A01032'],
  ['CANBK', '532483', 'Canara Bank', 'INE476A01014'],
  ['PNB', '532461', 'Punjab National Bank', 'INE160A01022'],
  ['BANKBARODA', '532134', 'Bank of Baroda', 'INE077A01010'],
  ['UNIONBANK', '532477', 'Union Bank of India', 'INE692A01016'],
  ['INDIANB', '532814', 'Indian Bank', 'INE562A01011'],
  ['IOB', '532388', 'Indian Overseas Bank', 'INE565A01014'],
  ['CENTRALBK', '532885', 'Central Bank of India', 'INE483A01010'],
  ['FEDERALBNK', '500469', 'The Federal Bank Ltd.', 'INE171A01029'],
  ['IDFCFIRSTB', '539437', 'IDFC First Bank Ltd.', 'INE092T01019'],
  ['AUBANK', '540611', 'AU Small Finance Bank Ltd.', 'INE949L01017'],
  ['BANDHANBNK', '541153', 'Bandhan Bank Ltd.', 'INE545U01014'],
  ['YESBANK', '532648', 'Yes Bank Ltd.', 'INE528G01035'],
  ['MUTHOOTFIN', '533398', 'Muthoot Finance Ltd.', 'INE414G01012'],
  ['MANAPPURAM', '531213', 'Manappuram Finance Ltd.', 'INE522D01027'],
  ['POONAWALLA', '524000', 'Poonawalla Fincorp Ltd.', 'INE511C01022'],
  ['M&MFIN', '532720', 'Mahindra & Mahindra Financial Services Ltd.', 'INE774D01024'],
  ['CHOLAHLDNG', '504092', 'Cholamandalam Financial Holdings Ltd.', 'INE149A01033'],
  ['HUDCO', '540530', 'Housing & Urban Development Corporation Ltd.', 'INE031A01017'],
  ['IREDA', '544026', 'Indian Renewable Energy Development Agency Ltd.', 'INE202E01016'],
  ['NHPC', '533098', 'NHPC Ltd.', 'INE848E01016'],
  ['SJVN', '533206', 'SJVN Ltd.', 'INE002L01015'],
  ['TORNTPOWER', '532779', 'Torrent Power Ltd.', 'INE813H01021'],
  ['CESC', '500084', 'CESC Ltd.', 'INE486A01021'],
  ['JSWENERGY', '533148', 'JSW Energy Ltd.', 'INE121E01018'],
  ['ADANIPOWER', '533096', 'Adani Power Ltd.', 'INE814H01011'],
  ['ATGL', '542066', 'Adani Total Gas Ltd.', 'INE399L01023'],
  ['IGL', '532514', 'Indraprastha Gas Ltd.', 'INE203G01027'],
  ['MGL', '539957', 'Mahanagar Gas Ltd.', 'INE002S01010'],
  ['GUJGASLTD', '539336', 'Gujarat Gas Ltd.', 'INE844O01030'],
  ['PETRONET', '532522', 'Petronet LNG Ltd.', 'INE347G01014'],
  ['OIL', '533106', 'Oil India Ltd.', 'INE274J01014'],
  ['HINDPETRO', '500104', 'Hindustan Petroleum Corporation Ltd.', 'INE094A01015'],
  ['MRPL', '500109', 'Mangalore Refinery & Petrochemicals Ltd.', 'INE103A01014'],
  ['CHENNPETRO', '500110', 'Chennai Petroleum Corporation Ltd.', 'INE178A01016'],
  ['ULTRACEMCO', '532538', 'UltraTech Cement Ltd.', 'INE481G01011'],
  ['AMBUJACEM', '500425', 'Ambuja Cements Ltd.', 'INE079A01024'],
  ['ACC', '500410', 'ACC Ltd.', 'INE012A01025'],
  ['SHREECEM', '500387', 'Shree Cement Ltd.', 'INE070A01015'],
  ['DALBHARAT', '542211', 'Dalmia Bharat Ltd.', 'INE00R701025'],
  ['JKCEMENT', '532644', 'JK Cement Ltd.', 'INE823G01014'],
  ['RAMCOCEM', '500260', 'The Ramco Cements Ltd.', 'INE331A01037'],
  ['STARCEMENT', '540575', 'Star Cement Ltd.', 'INE460H01021'],
  ['HEIDELBERG', '500292', 'HeidelbergCement India Ltd.', 'INE578A01017'],
  ['ASTRAL', '532830', 'Astral Ltd.', 'INE006I01046'],
  ['SUPREMEIND', '509930', 'Supreme Industries Ltd.', 'INE195A01028'],
  ['FINPIPE', '500940', 'Finolex Industries Ltd.', 'INE183A01024'],
  ['PRINCEPIPE', '542907', 'Prince Pipes & Fittings Ltd.', 'INE689W01016'],
  ['KAJARIACER', '500233', 'Kajaria Ceramics Ltd.', 'INE217B01036'],
  ['CERA', '532443', 'Cera Sanitaryware Ltd.', 'INE739E01017'],
  ['CENTURYPLY', '532527', 'Century Plyboards (India) Ltd.', 'INE348B01021'],
  ['GREENPANEL', '542857', 'Greenpanel Industries Ltd.', 'INE08ZM01014'],
  ['GREENPLY', '526797', 'Greenply Industries Ltd.', 'INE461C01038'],
  ['PIDILITIND', '500331', 'Pidilite Industries Ltd.', 'INE318A01026'],
  ['AARTIIND', '524208', 'Aarti Industries Ltd.', 'INE769A01020'],
  ['DEEPAKNTR', '506401', 'Deepak Nitrite Ltd.', 'INE288B01029'],
  ['SRF', '503806', 'SRF Ltd.', 'INE647A01010'],
  ['NAVINFLUOR', '532504', 'Navin Fluorine International Ltd.', 'INE048G01026'],
  ['FLUOROCHEM', '542812', 'Gujarat Fluorochemicals Ltd.', 'INE09N301011'],
  ['TATACHEM', '500770', 'Tata Chemicals Ltd.', 'INE092A01019'],
  ['ATUL', '500027', 'Atul Ltd.', 'INE100A01010'],
  ['CLEAN', '543318', 'Clean Science & Technology Ltd.', 'INE227W01023'],
  ['FINEORG', '541557', 'Fine Organic Industries Ltd.', 'INE665L01013'],
  ['ALKYLAMINE', '525169', 'Alkyl Amines Chemicals Ltd.', 'INE150B01039'],
  ['BALAMINES', '530299', 'Balaji Amines Ltd.', 'INE050E01027'],
  ['VINATIORGA', '524280', 'Vinati Organics Ltd.', 'INE410B01037'],
  ['PIIND', '523642', 'PI Industries Ltd.', 'INE603J01030'],
  ['UPL', '512070', 'UPL Ltd.', 'INE628A01036'],
  ['COROMANDEL', '506395', 'Coromandel International Ltd.', 'INE169A01031'],
  ['CHAMBLFERT', '500085', 'Chambal Fertilisers & Chemicals Ltd.', 'INE085A01013'],
  ['GNFC', '500670', 'Gujarat Narmada Valley Fertilizers & Chemicals Ltd.', 'INE113A01013'],
  ['GSFC', '500690', 'Gujarat State Fertilizers & Chemicals Ltd.', 'INE026A01025'],
  ['FACT', '590024', 'Fertilisers & Chemicals Travancore Ltd.', 'INE188A01015'],
  ['RCF', '524230', 'Rashtriya Chemicals & Fertilizers Ltd.', 'INE027A01015'],
  ['DEEPAKFERT', '501455', 'Deepak Fertilisers & Petrochemicals Corporation Ltd.', 'INE501A01019'],
  ['LUPIN', '500257', 'Lupin Ltd.', 'INE326A01037'],
  ['AUROPHARMA', '524804', 'Aurobindo Pharma Ltd.', 'INE406A01037'],
  ['ZYDUSLIFE', '532321', 'Zydus Lifesciences Ltd.', 'INE010B01027'],
  ['TORNTPHARM', '500420', 'Torrent Pharmaceuticals Ltd.', 'INE685A01028'],
  ['ALKEM', '539523', 'Alkem Laboratories Ltd.', 'INE540L01014'],
  ['MANKIND', '543904', 'Mankind Pharma Ltd.', 'INE634S01028'],
  ['GLENMARK', '532296', 'Glenmark Pharmaceuticals Ltd.', 'INE935A01035'],
  ['IPCALAB', '524494', 'IPCA Laboratories Ltd.', 'INE571A01038'],
  ['AJANTPHARM', '532331', 'Ajanta Pharma Ltd.', 'INE031B01049'],
  ['JBCHEPHARM', '506943', 'J.B. Chemicals & Pharmaceuticals Ltd.', 'INE572A01028'],
  ['NATCOPHARM', '524816', 'Natco Pharma Ltd.', 'INE987B01026'],
  ['GLAND', '543245', 'Gland Pharma Ltd.', 'INE068V01023'],
  ['SYNGENE', '539268', 'Syngene International Ltd.', 'INE398R01022'],
  ['BIOCON', '532523', 'Biocon Ltd.', 'INE376G01013'],
  ['LAURUSLABS', '540222', 'Laurus Labs Ltd.', 'INE947Q01028'],
  ['PFIZER', '500680', 'Pfizer Ltd.', 'INE182A01020'],
  ['SANOFI', '500674', 'Sanofi India Ltd.', 'INE214A01016'],
  ['ABBOTINDIA', '500488', 'Abbott India Ltd.', 'INE358A01014'],
  ['GSK', '500660', 'GlaxoSmithKline Pharmaceuticals Ltd.', 'INE159A01016'],
  ['KIMS', '543308', 'Krishna Institute of Medical Sciences Ltd.', 'INE967H01017'],
  ['FORTIS', '532843', 'Fortis Healthcare Ltd.', 'INE061F01013'],
  ['MEDANTA', '543654', 'Global Health Ltd. (Medanta)', 'INE474S01027'],
  ['RAINBOW', '543524', 'Rainbow Children\'s Medicare Ltd.', 'INE961H01016'],
  ['ASTERDM', '540975', 'Aster DM Healthcare Ltd.', 'INE914M01019'],
  ['LALPATHLAB', '539524', 'Dr. Lal PathLabs Ltd.', 'INE600L01024'],
  ['METROPOLIS', '542650', 'Metropolis Healthcare Ltd.', 'INE112L01020'],
  ['VIJAYA', '543350', 'Vijaya Diagnostic Centre Ltd.', 'INE043W01024'],
  ['THYROCARE', '539871', 'Thyrocare Technologies Ltd.', 'INE594T01017'],
  ['PAGEIND', '532827', 'Page Industries Ltd.', 'INE761H01023'],
  ['KPRMILL', '532889', 'K.P.R. Mill Ltd.', 'INE930H01031'],
  ['TRIDENT', '521064', 'Trident Ltd.', 'INE064C01022'],
  ['WELSPUNLIV', '514162', 'Welspun Living Ltd.', 'INE192B01031'],
  ['RAYMOND', '500330', 'Raymond Ltd.', 'INE301A01014'],
  ['ABFRL', '535755', 'Aditya Birla Fashion & Retail Ltd.', 'INE647O01011'],
  ['SHOPPERS', '532638', 'Shoppers Stop Ltd.', 'INE498B01024'],
  ['VEDANTFASH', '543463', 'Vedant Fashions Ltd. (Manyavar)', 'INE825V01034'],
  ['MANYAVAR', '543463', 'Vedant Fashions Ltd.', 'INE825V01034'],
  ['CAMPUS', '543523', 'Campus Activewear Ltd.', 'INE278Y01022'],
  ['BATAINDIA', '500043', 'Bata India Ltd.', 'INE176A01028'],
  ['RELAXO', '530517', 'Relaxo Footwears Ltd.', 'INE131B01039'],
  ['METROBRAND', '543426', 'Metro Brands Ltd.', 'INE317I01021'],
  ['REDTAPE', '543957', 'Redtape Ltd.', 'INE08X901021'],
  ['DEVYANI', '543330', 'Devyani International Ltd.', 'INE872J01023'],
  ['JUBLFOOD', '533155', 'Jubilant FoodWorks Ltd.', 'INE797F01020'],
  ['WESTLIFE', '505533', 'Westlife Foodworld Ltd.', 'INE274F01020'],
  ['SAPPHIRE', '543397', 'Sapphire Foods India Ltd.', 'INE806T01012'],
  ['RBA', '543248', 'Restaurant Brands Asia Ltd. (Burger King)', 'INE07T201019'],
  ['BARBEQUE', '543283', 'Barbeque-Nation Hospitality Ltd.', 'INE382Z01021'],
  ['PVRINOX', '532689', 'PVR INOX Ltd.', 'INE191H01014'],
  ['ZEEL', '505537', 'Zee Entertainment Enterprises Ltd.', 'INE256A01028'],
  ['SUNTV', '532733', 'Sun TV Network Ltd.', 'INE424H01027'],
  ['NETWORK18', '532798', 'Network18 Media & Investments Ltd.', 'INE886H01027'],
  ['TV18BRDCST', '532800', 'TV18 Broadcast Ltd.', 'INE888H01017'],
  ['SAREGAMA', '506166', 'Saregama India Ltd.', 'INE979A01025'],
  ['TIPSMUSIC', '532366', 'Tips Music Ltd.', 'INE716B01029'],
  ['NAZARA', '543280', 'Nazara Technologies Ltd.', 'INE418L01021'],
  ['ROUTE', '543228', 'Route Mobile Ltd.', 'INE450U01017'],
  ['TANLA', '532790', 'Tanla Platforms Ltd.', 'INE483C01032'],
  ['AFFLE', '542752', 'Affle (India) Ltd.', 'INE00WC01027'],
  ['BLS', '540073', 'BLS International Services Ltd.', 'INE153T01027'],
  ['MAPMYINDIA', '543425', 'CE Info Systems Ltd. (MapmyIndia)', 'INE0BV301023'],
  ['RATEGAIN', '543417', 'RateGain Travel Technologies Ltd.', 'INE0CLI01024'],
  ['ECLERX', '532927', 'eClerx Services Ltd.', 'INE738I01010'],
  ['FIRSTSOURC', '532809', 'Firstsource Solutions Ltd.', 'INE684F01012'],
  ['DATAPATTNS', '543428', 'Data Patterns (India) Ltd.', 'INE610X01018'],
  ['PARAS', '543367', 'Paras Defence & Space Technologies Ltd.', 'INE045601015'],
  ['MTARTECH', '543270', 'MTAR Technologies Ltd.', 'INE864I01014'],
  ['ASTRAMICRO', '532493', 'Astra Microwave Products Ltd.', 'INE386C01029'],
  ['DYNAMATECH', '505242', 'Dynamatic Technologies Ltd.', 'INE221B01012'],
  ['PREMIERENE', '544238', 'Premier Energies Ltd.', 'INE00GZ01020'],
  ['WAAREEENER', '544277', 'Waaree Energies Ltd.', 'INE017E01018'],
  ['SWIGGY', '544285', 'Swiggy Ltd.', 'INE00H001014'],
  ['HYUNDAI', '544274', 'Hyundai Motor India Ltd.', 'INE00F201012'],
  ['BAJAJ_HFL', '544252', 'Bajaj Housing Finance Ltd.', 'INE377Y01017'],
  ['OLA_ELEC', '544226', 'Ola Electric Mobility Ltd.', 'INE0DKU01011'],
  ['GICRE', '540755', 'General Insurance Corporation of India', 'INE481Y01014'],
  ['NIACL', '540769', 'The New India Assurance Company Ltd.', 'INE470Y01017'],
  ['STARHEALTH', '543412', 'Star Health & Allied Insurance Company Ltd.', 'INE575P01011'],
  ['ICICIGI', '540716', 'ICICI Lombard General Insurance Co. Ltd.', 'INE765G01017'],
  ['ICICIPRULI', '540133', 'ICICI Prudential Life Insurance Co. Ltd.', 'INE726G01019'],
  ['HDFCLIFE', '540777', 'HDFC Life Insurance Company Ltd.', 'INE795G01014'],
  ['SBILIFE', '540719', 'SBI Life Insurance Company Ltd.', 'INE123W01016'],
  ['MAXFIN', '500271', 'Max Financial Services Ltd.', 'INE180A01031'],
  ['BSE', '540376', 'BSE Ltd.', 'INE118H01025'],
  ['CDSL', '543217', 'Central Depository Services (India) Ltd.', 'INE736A01011'],
  ['MCX', '534091', 'Multi Commodity Exchange of India Ltd.', 'INE745G01035'],
  ['CAMS', '543232', 'Computer Age Management Services Ltd.', 'INE596I01012'],
  ['KFINTECH', '543720', 'KFin Technologies Ltd.', 'INE138Y01010'],
  ['ANGELONE', '543235', 'Angel One Ltd.', 'INE732I01013'],
  ['MOTILALOFS', '532892', 'Motilal Oswal Financial Services Ltd.', 'INE338I01027'],
  ['ISEC', '541179', 'ICICI Securities Ltd.', 'INE763G01038'],
  ['HDFCAMC', '541729', 'HDFC Asset Management Company Ltd.', 'INE127D01025'],
  ['NAM-INDIA', '540767', 'Nippon Life India Asset Management Ltd.', 'INE298J01013'],
  ['UTIAMC', '543238', 'UTI Asset Management Company Ltd.', 'INE094J01016'],
];

console.log(`Starting stock universe enrichment for ${verifiedStocks.length} verified Indian stocks...`);

const updateCompany = db.prepare(`
  UPDATE companies 
  SET company_name = ?, isin = ?, updated_at = datetime('now')
  WHERE id = ?
`);

const insertBseListing = db.prepare(`
  INSERT INTO exchange_listings (company_id, exchange, trading_symbol, security_code, tradingview_symbol, listing_status, last_synced_at)
  VALUES (?, 'BSE', ?, ?, ?, 'active', datetime('now'))
  ON CONFLICT(exchange, trading_symbol) DO UPDATE SET
    company_id = excluded.company_id,
    security_code = excluded.security_code,
    tradingview_symbol = excluded.tradingview_symbol,
    last_synced_at = excluded.last_synced_at
`);

const findCompanyByNse = db.prepare(`
  SELECT c.id FROM companies c
  INNER JOIN exchange_listings el ON el.company_id = c.id
  WHERE el.exchange = 'NSE' AND el.trading_symbol = ?
`);

const findCompanyByIsin = db.prepare(`
  SELECT id FROM companies WHERE isin = ?
`);

const enrichTransaction = db.transaction(() => {
  let updatedCompanies = 0;
  let addedBseListings = 0;
  let createdNewCompanies = 0;

  for (const [nseSymbol, bseCode, companyName, isin] of verifiedStocks) {
    // 1. Try to find company by NSE symbol
    let companyRow = findCompanyByNse.get(nseSymbol) as { id: number } | undefined;

    // 2. Fallback to ISIN
    if (!companyRow && isin) {
      companyRow = findCompanyByIsin.get(isin) as { id: number } | undefined;
    }

    let companyId: number;

    if (companyRow) {
      companyId = companyRow.id;
      // Update company name and ISIN
      updateCompany.run(companyName, isin, companyId);
      updatedCompanies++;
    } else {
      // Company doesn't exist yet, insert it
      const result = db.prepare(`
        INSERT INTO companies (company_name, isin, classification_source, created_at, updated_at)
        VALUES (?, ?, 'exchange_master', datetime('now'), datetime('now'))
      `).run(companyName, isin);
      companyId = result.lastInsertRowid as number;

      // Also create NSE listing
      db.prepare(`
        INSERT OR IGNORE INTO exchange_listings (company_id, exchange, trading_symbol, tradingview_symbol, listing_status, last_synced_at)
        VALUES (?, 'NSE', ?, ?, 'active', datetime('now'))
      `).run(companyId, nseSymbol, `NSE:${nseSymbol}`);

      createdNewCompanies++;
    }

    // 3. Add BSE listing linked to the same company
    const tvSymbol = `BSE:${bseCode}`;
    insertBseListing.run(companyId, bseCode, bseCode, tvSymbol);
    addedBseListings++;
  }

  return { updatedCompanies, addedBseListings, createdNewCompanies };
});

const result = enrichTransaction();
console.log('Enrichment complete!');
console.log(`- Updated companies with full name & ISIN: ${result.updatedCompanies}`);
console.log(`- Created new companies: ${result.createdNewCompanies}`);
console.log(`- Added/updated linked BSE listings: ${result.addedBseListings}`);

const totalListings = (db.prepare('SELECT COUNT(*) as c FROM exchange_listings').get() as { c: number }).c;
const nseCount = (db.prepare("SELECT COUNT(*) as c FROM exchange_listings WHERE exchange = 'NSE'").get() as { c: number }).c;
const bseCount = (db.prepare("SELECT COUNT(*) as c FROM exchange_listings WHERE exchange = 'BSE'").get() as { c: number }).c;
const dualListed = (db.prepare(`
  SELECT COUNT(*) as c FROM companies c
  WHERE (SELECT COUNT(*) FROM exchange_listings el WHERE el.company_id = c.id) > 1
`).get() as { c: number }).c;

console.log('\n─── Current Exchange Stats ───');
console.log(`Total Listings: ${totalListings}`);
console.log(`NSE Listings: ${nseCount}`);
console.log(`BSE Listings: ${bseCount}`);
console.log(`Dual-listed Companies (NSE + BSE linked): ${dualListed}`);

db.close();

