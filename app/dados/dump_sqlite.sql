PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE equipamentos (
	id INTEGER NOT NULL, 
	nome VARCHAR NOT NULL, 
	categoria VARCHAR, 
	valor_aluguel FLOAT NOT NULL, 
	quantidade INTEGER NOT NULL, 
	PRIMARY KEY (id)
);
INSERT INTO equipamentos VALUES(1,'Black Magic Pocket Cinema Camera 4K  + Rig completo Smallrig + Plate V-mount ZGcine + 1 SSD Samsung T5 1T','Câmeras',350.0,2);
INSERT INTO equipamentos VALUES(2,'Panasonic Lumix GH4 ','Câmeras',100.0,1);
INSERT INTO equipamentos VALUES(3,'GoPro Hero 12 Black + cartao 128GB','Câmeras',150.0,1);
INSERT INTO equipamentos VALUES(4,'Lente Sigma Art 18-35mm 1.8 EF (Cropped Sensor)','Lentes',150.0,1);
INSERT INTO equipamentos VALUES(5,'Lente Canon 50mm 1.8 EF','Lentes',50.0,1);
INSERT INTO equipamentos VALUES(6,'Lente Canon 70-200mm 2.8 IS EF','Lentes',200.0,1);
INSERT INTO equipamentos VALUES(7,'Kit Lente Meike Fullframe (16, 24, 35, 50, 85) EF','Lentes',600.0,1);
INSERT INTO equipamentos VALUES(8,'Lente Meike Fullframe 16mm T2.5 EF','Lentes',180.0,1);
INSERT INTO equipamentos VALUES(9,'Lente Meike Fullframe 24mm T2.1 EF','Lentes',180.0,1);
INSERT INTO equipamentos VALUES(10,'Lente Meike Fullframe 35mm T2.1 EF','Lentes',180.0,1);
INSERT INTO equipamentos VALUES(11,'Lente Meike Fullframe 50mm T2.1 EF','Lentes',180.0,1);
INSERT INTO equipamentos VALUES(12,'Lente Meike Fullframe 85mm T2.1 EF','Lentes',180.0,1);
INSERT INTO equipamentos VALUES(13,'IRND Nisi Nano 0.6 4x5.65','Filtros, Adaptadores e Acessórios de Camera',80.0,1);
INSERT INTO equipamentos VALUES(14,'IRND Nisi Nano 0.9 4x5.65','Filtros, Adaptadores e Acessórios de Camera',80.0,1);
INSERT INTO equipamentos VALUES(15,'IRND Nisi Nano 1.2 4x5.65','Filtros, Adaptadores e Acessórios de Camera',80.0,1);
INSERT INTO equipamentos VALUES(16,'IRND Nisi Nano 1.8 4x5.65','Filtros, Adaptadores e Acessórios de Camera',80.0,1);
INSERT INTO equipamentos VALUES(17,'Tiffen Black Promist 1/4 4x5.65','Filtros, Adaptadores e Acessórios de Camera',80.0,1);
INSERT INTO equipamentos VALUES(18,'Filtro ND 77mm da Tiffen 2 a 8 f-stops','Filtros, Adaptadores e Acessórios de Camera',80.0,1);
INSERT INTO equipamentos VALUES(19,'Mattebox Smallrig para 2 filtros','Filtros, Adaptadores e Acessórios de Camera',80.0,1);
INSERT INTO equipamentos VALUES(20,'Metabones Speed Booster XL 0.64x Canon EF-Mount to 4/3','Filtros, Adaptadores e Acessórios de Camera',100.0,1);
INSERT INTO equipamentos VALUES(21,'Metabones Speed Booster Ultra 0.71x Canon EF-Mount to 4/3','Filtros, Adaptadores e Acessórios de Camera',100.0,1);
INSERT INTO equipamentos VALUES(22,'Adaptador simples Canon EF-Mount to 4/3 (sem controle de irirs)','Filtros, Adaptadores e Acessórios de Camera',30.0,1);
INSERT INTO equipamentos VALUES(23,'Adaptador Extensor de lente Canon para Macro (13mm, 21mm, 31mm)','Filtros, Adaptadores e Acessórios de Camera',30.0,1);
INSERT INTO equipamentos VALUES(24,'Case à prova d''agua para a Mirrorless e DSLR','Filtros, Adaptadores e Acessórios de Camera',30.0,1);
INSERT INTO equipamentos VALUES(25,'Monitor 5" Portkeys BM5WIII 2200nit','Monitoramento/Transmissão/Comunicação',100.0,1);
INSERT INTO equipamentos VALUES(26,'Monitor 5" Portkeys BM5WRIII 2200nit','Monitoramento/Transmissão/Comunicação',100.0,1);
INSERT INTO equipamentos VALUES(27,'Monitor 7" Portkeys HS7T Metal Edition 1200nit','Monitoramento/Transmissão/Comunicação',105.0,1);
INSERT INTO equipamentos VALUES(28,'Wireless follow focus Tilta  Nucleus-M','Monitoramento/Transmissão/Comunicação',150.0,1);
INSERT INTO equipamentos VALUES(29,'Acsoon Cineview SE transmissor de video (1TX + 2RX)','Monitoramento/Transmissão/Comunicação',200.0,1);
INSERT INTO equipamentos VALUES(30,'Hollyland Solidcom C1 Pro-4s Intercom (1 Master + 3 Fones)','Monitoramento/Transmissão/Comunicação',200.0,1);
INSERT INTO equipamentos VALUES(31,'Kit 4 Radio Comunicador Baofeng Bf-777s ','Monitoramento/Transmissão/Comunicação',80.0,1);
INSERT INTO equipamentos VALUES(32,'Aputure 120D mk2 ','Luz',150.0,1);
INSERT INTO equipamentos VALUES(33,'Aputure 300D mk2','Luz',200.0,1);
INSERT INTO equipamentos VALUES(34,'Amaran 200D','Luz',150.0,2);
INSERT INTO equipamentos VALUES(35,'Amaran 300C','Luz',250.0,2);
INSERT INTO equipamentos VALUES(36,'Aputure MC','Luz',50.0,4);
INSERT INTO equipamentos VALUES(37,'Aputure BC7','Luz',75.0,2);
INSERT INTO equipamentos VALUES(38,'Modificador Aputure Fresnel 2x ','Luz',80.0,1);
INSERT INTO equipamentos VALUES(39,'Modificador Aputure Light Dome II ','Luz',80.0,1);
INSERT INTO equipamentos VALUES(40,'Modificador Aputure Dome Mini II','Luz',50.0,1);
INSERT INTO equipamentos VALUES(41,'Modificador Aputure Lantern','Luz',50.0,1);
INSERT INTO equipamentos VALUES(42,'Spotlight Godox VSA-36K','Luz',150.0,1);
INSERT INTO equipamentos VALUES(43,'Painel de Led Neewer 660 RGB','Luz',80.0,1);
INSERT INTO equipamentos VALUES(44,'Kit Paineis Youngnuo (YN600 + 2 YN900)) + 2 baterias NP','Luz',150.0,1);
INSERT INTO equipamentos VALUES(45,'Painel de Led Youngnuo YN300   (3200K-5500K) + 4 baterias NP','Luz',50.0,1);
INSERT INTO equipamentos VALUES(46,'Painel de Led Youngnuo YN600  (3200K-5500K) + 4 baterias NP + Cabo de alimentacao','Luz',80.0,1);
INSERT INTO equipamentos VALUES(47,'Paineis de Led Youngnuo YN900  (5500K)+ 4 baterias NP + Cabo de alimentacao (5500K)','Luz',100.0,2);
INSERT INTO equipamentos VALUES(48,'Kit de gelatinas Rosco cores variadas','Luz',10.0,1);
INSERT INTO equipamentos VALUES(49,'Rebatedor/Difusor Circular 5x1 110cm','Luz',10.0,1);
INSERT INTO equipamentos VALUES(50,'Rebatedor/Difusor Oval 5x1 120x180cm','Luz',10.0,1);
INSERT INTO equipamentos VALUES(51,'Rebatedor verde/azul Oval 5x1 120x180cm','Luz',10.0,1);
INSERT INTO equipamentos VALUES(52,'Microfone Shotgun Audio-Technica AT897K + Windshield Movo WS221','Audio',100.0,1);
INSERT INTO equipamentos VALUES(53,'Lapela Deity DuoRX  (2tx + 1rx)','Audio',100.0,1);
INSERT INTO equipamentos VALUES(54,'Gravador TASCAM DR60D + cartão de 32GB +  Powerbank 22400mAh','Audio',150.0,1);
INSERT INTO equipamentos VALUES(55,'Hollyland LARK1 50 Duo (2 lapelas + receiver)','Audio',100.0,1);
INSERT INTO equipamentos VALUES(56,'Boom pole 12ft FALCON 2','Audio',30.0,1);
INSERT INTO equipamentos VALUES(57,'Girafa Greika de aluminio para microfone','Audio',10.0,1);
INSERT INTO equipamentos VALUES(58,'Black Magic ATEM Mini Pro','Live/Eventos',100.0,2);
INSERT INTO equipamentos VALUES(59,'Par de Conversore HDMI-SDI/SDI-HDMI Blackmagic','Live/Eventos',50.0,1);
INSERT INTO equipamentos VALUES(60,'Mesa de som Yamaha MG10XU','Live/Eventos',120.0,1);
INSERT INTO equipamentos VALUES(61,'Medusa 10 canais 20 mts','Live/Eventos',50.0,3);
INSERT INTO equipamentos VALUES(62,'Cabs SDI 50mt Belden','Live/Eventos',60.0,1);
INSERT INTO equipamentos VALUES(63,'Microfone de mão Sure SM-58','Live/Eventos',50.0,1);
INSERT INTO equipamentos VALUES(64,'Kit 4 microfones de palco sem fio Phenix Pro','Live/Eventos',100.0,1);
INSERT INTO equipamentos VALUES(65,'Optoma Technology EH416 4200-Lumen Full HD DLP Projector (1920x1080)','Live/Eventos',250.0,1);
INSERT INTO equipamentos VALUES(66,'Tela 150" 16:9 (AxL 1.87 x 3.32)','Live/Eventos',100.0,1);
INSERT INTO equipamentos VALUES(67,'DJI Mavic Pro + 3 baterias + Ipad mini + cartão de 64GB + Jogo de filtros ND Polar Pro: 4 8 e 16','Drone',300.0,1);
INSERT INTO equipamentos VALUES(68,'Gimbal Estabilizador 3-eixos DJI Ronin-RS2 (Payload  4.5 kg)','Tripé/Estabilizadores/Suporte',200.0,1);
INSERT INTO equipamentos VALUES(69,'Tilta Ring Grip (com controle de cabeça e foco, 2pontos de energia + Vmount support)','Tripé/Estabilizadores/Suporte',150.0,1);
INSERT INTO equipamentos VALUES(70,'Tripé de câmera Cartoni + Head Sachtler Video 18p','Tripé/Estabilizadores/Suporte',300.0,1);
INSERT INTO equipamentos VALUES(71,'Tripé de câmera Manfrotto 546GB + Head Manfrotto 504HD','Tripé/Estabilizadores/Suporte',150.0,1);
INSERT INTO equipamentos VALUES(72,'Tripé de câmera Manfrotto 535 fibra de carbono + Head Manfrotto Mch502ah','Tripé/Estabilizadores/Suporte',100.0,1);
INSERT INTO equipamentos VALUES(73,'Monopé Manfrotto 562-B1 com engate 357','Tripé/Estabilizadores/Suporte',80.0,1);
INSERT INTO equipamentos VALUES(74,'Tripé C-Stand (Century) (alt.Máx 3,30m Payload 10Kg)','Elétrica/Maquinário/Acessórios',30.0,5);
INSERT INTO equipamentos VALUES(75,'Girafa M-5 multifuncional com rodas (alt.Máx 4m Payload 20Kg)','Elétrica/Maquinário/Acessórios',100.0,1);
INSERT INTO equipamentos VALUES(76,'Tripé em aço 3606 com rodas (alt.Máx 2,70m Payload 10Kg)','Elétrica/Maquinário/Acessórios',50.0,2);
INSERT INTO equipamentos VALUES(77,'Tripé de alumnínio (Payload 10Kg)','Elétrica/Maquinário/Acessórios',20.0,1);
INSERT INTO equipamentos VALUES(78,'Butter 2.40mtx2.40mt dobravel (Difusor 1/2, Difusor 1/4, Ultrabounce, Black, Silver, Chroma verde)','Elétrica/Maquinário/Acessórios',150.0,1);
INSERT INTO equipamentos VALUES(79,'Tripé comuns de aluminio Greika (still)','Elétrica/Maquinário/Acessórios',10.0,3);
INSERT INTO equipamentos VALUES(80,'Cabeças de efeito','Elétrica/Maquinário/Acessórios',10.0,7);
INSERT INTO equipamentos VALUES(81,'Baby pin','Elétrica/Maquinário/Acessórios',5.0,3);
INSERT INTO equipamentos VALUES(82,'Pino espiga','Elétrica/Maquinário/Acessórios',5.0,2);
INSERT INTO equipamentos VALUES(83,'Vareta de aluminio 1.25mt','Elétrica/Maquinário/Acessórios',10.0,3);
INSERT INTO equipamentos VALUES(84,'Bandeiras 90x45 (preto, difusor, prata/branco/bronze)','Elétrica/Maquinário/Acessórios',10.0,3);
INSERT INTO equipamentos VALUES(85,'Carolina pequena (6 cm)','Elétrica/Maquinário/Acessórios',10.0,1);
INSERT INTO equipamentos VALUES(86,'Carolina media (16 cm)','Elétrica/Maquinário/Acessórios',10.0,1);
INSERT INTO equipamentos VALUES(87,'Carolina grande (28 cm)','Elétrica/Maquinário/Acessórios',10.0,2);
INSERT INTO equipamentos VALUES(88,'Algemas fixa','Elétrica/Maquinário/Acessórios',10.0,4);
INSERT INTO equipamentos VALUES(89,'Algemas pino','Elétrica/Maquinário/Acessórios',10.0,4);
INSERT INTO equipamentos VALUES(90,'Algemas cubo','Elétrica/Maquinário/Acessórios',10.0,2);
INSERT INTO equipamentos VALUES(91,'Algema barra plana','Elétrica/Maquinário/Acessórios',10.0,1);
INSERT INTO equipamentos VALUES(92,'Barracuda','Elétrica/Maquinário/Acessórios',80.0,1);
INSERT INTO equipamentos VALUES(93,'Emenda de tubo','Elétrica/Maquinário/Acessórios',10.0,1);
INSERT INTO equipamentos VALUES(94,'Tubo 2" de 3mt','Elétrica/Maquinário/Acessórios',10.0,1);
INSERT INTO equipamentos VALUES(95,'Tubo 2" de 1.5mt','Elétrica/Maquinário/Acessórios',10.0,2);
INSERT INTO equipamentos VALUES(96,'Tubo 2" de 2mt','Elétrica/Maquinário/Acessórios',10.0,2);
INSERT INTO equipamentos VALUES(97,'Tubo 2" de 1mt','Elétrica/Maquinário/Acessórios',10.0,2);
INSERT INTO equipamentos VALUES(98,'Sacos de areia/contrapeso 4Kg','Elétrica/Maquinário/Acessórios',5.0,8);
INSERT INTO equipamentos VALUES(99,'Kit prolongas 10mt (6 unid)','Elétrica/Maquinário/Acessórios',50.0,1);
INSERT INTO equipamentos VALUES(100,'Três-tabela','Elétrica/Maquinário/Acessórios',10.0,4);
INSERT INTO equipamentos VALUES(101,'Máquina de Fumaça FWS500','Elétrica/Maquinário/Acessórios',80.0,1);
INSERT INTO equipamentos VALUES(102,'Kit Cabos de segurança (10 unid)','Elétrica/Maquinário/Acessórios',10.0,1);
INSERT INTO equipamentos VALUES(103,'Kit Pano preto ( 2 unid) 3x3mt','Elétrica/Maquinário/Acessórios',10.0,1);
INSERT INTO equipamentos VALUES(104,'Bateria V-mount ZGcine 200W/h','Baterias',80.0,4);
INSERT INTO equipamentos VALUES(105,'Bateria v-mount 230W/h','Baterias',80.0,1);
INSERT INTO equipamentos VALUES(106,'Bateria NP-F970 + Carregador quadruplo','Baterias',30.0,4);
INSERT INTO equipamentos VALUES(107,'Carregador simples bateria V-mount','Baterias',30.0,2);
INSERT INTO equipamentos VALUES(108,'Carregador duplo ZGCine batera V-Mount','Baterias',50.0,2);
INSERT INTO equipamentos VALUES(109,'Handcam Canon','Câmeras',50.0,1);
CREATE TABLE servicos (
	id INTEGER NOT NULL, 
	data_contratacao DATE NOT NULL, 
	tipo_servico VARCHAR NOT NULL, 
	cliente_id INTEGER, 
	descricao VARCHAR, 
	valor_total FLOAT NOT NULL, 
	valor_desconto FLOAT, 
	valor_final FLOAT NOT NULL, 
	data_previsao_pagamento DATE NOT NULL, 
	status VARCHAR, valor_pendente_atual FLOAT DEFAULT 0, numero_diarias INTEGER NOT NULL DEFAULT 1, valor_diaria_cache REAL NOT NULL DEFAULT 0.0, valor_diaria_equipamentos REAL NOT NULL DEFAULT 0.0, is_pacote BOOLEAN NOT NULL DEFAULT 0, 
	PRIMARY KEY (id), 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id)
);
INSERT INTO servicos VALUES(3,'2024-10-29','Job',31,'Serie Documental',60685.0,0.0,60685.0,'2024-11-28','pago',0.0,1,50000.0,10685.0,0);
INSERT INTO servicos VALUES(4,'2025-01-20','Aluguel',59,'Aluguel Handcam',50.0,0.0,50.0,'2025-02-19','pago',0.0,1,0.0,50.0,0);
INSERT INTO servicos VALUES(5,'2025-01-22','Aluguel',25,'Aluguel drone',300.0,0.0,300.0,'2025-02-21','pago',0.0,1,0.0,300.0,0);
INSERT INTO servicos VALUES(6,'2025-01-23','Aluguel',2,'Aluguel Sigma #1',150.0,0.0,150.0,'2025-02-22','pago',0.0,1,0.0,150.0,0);
INSERT INTO servicos VALUES(7,'2025-02-14','Aluguel',16,'Aluguel Telao desmontavel',300.0,150.0,150.0,'2025-03-16','pago',0.0,3,0.0,100.0,0);
INSERT INTO servicos VALUES(8,'2025-02-17','Aluguel',28,'Aluguel 120D',300.0,50.0,250.0,'2025-03-19','pago',0.0,1,0.0,300.0,0);
INSERT INTO servicos VALUES(9,'2025-03-22','Aluguel',59,'Aluguel handcam',100.0,0.0,100.0,'2025-04-21','pago',0.0,2,0.0,50.0,0);
INSERT INTO servicos VALUES(11,'2025-03-23','Aluguel',41,'Aluguel sigma 18-35',150.0,0.0,150.0,'2025-04-22','pago',0.0,1,0.0,150.0,0);
INSERT INTO servicos VALUES(12,'2025-04-28','Aluguel',2,'Aluguel sigma #2',150.0,0.0,150.0,'2025-05-28','pago',0.0,1,0.0,150.0,0);
INSERT INTO servicos VALUES(13,'2025-05-02','Aluguel',32,'Aluguel spot+ mcs 350$',350.0,0.0,350.0,'2025-06-01','pago',0.0,1,0.0,350.0,0);
INSERT INTO servicos VALUES(14,'2025-05-12','Aluguel',32,'Varios maquinarios 2 dias',1320.0,0.0,1320.0,'2025-06-11','pago',0.0,2,0.0,660.0,1);
INSERT INTO servicos VALUES(15,'2025-06-10','Aluguel',50,'Aluguel equipa de som',200.0,0.0,200.0,'2025-07-10','pago',0.0,1,0.0,200.0,1);
INSERT INTO servicos VALUES(16,'2025-06-22','Aluguel',32,'4 mcs 3 dias',600.0,0.0,600.0,'2025-07-22','pago',0.0,3,0.0,200.0,0);
INSERT INTO servicos VALUES(18,'2025-07-14','Aluguel',60,'aluguel handcam #2',50.0,0.0,50.0,'2025-08-13','pago',0.0,1,0.0,50.0,0);
INSERT INTO servicos VALUES(19,'2025-07-24','Aluguel',61,'Aluguel Sigma',600.0,100.0,500.0,'2025-08-23','pago',0.0,4,0.0,150.0,0);
INSERT INTO servicos VALUES(20,'2025-08-05','Aluguel',32,'Aluguel 4 algema 3 dias',120.0,0.0,120.0,'2025-09-04','pago',0.0,3,0.0,40.0,0);
INSERT INTO servicos VALUES(21,'2025-08-07','Aluguel',50,'Aluguem som',100.0,0.0,100.0,'2025-09-06','pago',0.0,1,0.0,100.0,1);
INSERT INTO servicos VALUES(23,'2025-08-28','Aluguel',14,'Aluguel pocket (nao estava)',350.0,0.0,350.0,'2025-09-27','pendente',350.0,1,0.0,350.0,0);
INSERT INTO servicos VALUES(24,'2025-09-02','Aluguel',50,'Aluguel gravador',150.0,50.0,100.0,'2025-10-02','pago',0.0,1,0.0,150.0,0);
INSERT INTO servicos VALUES(25,'2025-09-02','Aluguel',51,'Aluguel Drone',600.0,0.0,600.0,'2025-10-02','pendente',600.0,2,0.0,300.0,0);
INSERT INTO servicos VALUES(26,'2025-09-08','Aluguel',61,'Aluguel sigam 2 dias',300.0,0.0,300.0,'2025-10-08','pago',0.0,2,0.0,150.0,0);
INSERT INTO servicos VALUES(27,'2025-09-23','Aluguel',20,'Aluguel GoPro',150.0,0.0,150.0,'2025-10-23','pago',0.0,1,0.0,150.0,0);
INSERT INTO servicos VALUES(28,'2025-09-27','Aluguel',51,'Aluguel Drone',300.0,0.0,300.0,'2025-10-27','pendente',300.0,1,0.0,300.0,0);
INSERT INTO servicos VALUES(29,'2025-03-31','Aluguel',32,'Aluguel 4 mcs 2 dias + 2 desloc',800.0,300.0,500.0,'2025-04-30','pago',0.0,4,0.0,200.0,0);
INSERT INTO servicos VALUES(30,'2025-07-13','Aluguel',32,'Varios equipa de Eletrica 4 dias',4860.0,1494.0,3366.0,'2025-08-12','pago',0.0,4,0.0,1215.0,0);
INSERT INTO servicos VALUES(31,'2025-09-03','Aluguel',62,'Aluguel tripe Sachtler',600.0,0.0,600.0,'2025-10-03','pago',0.0,2,0.0,300.0,0);
INSERT INTO servicos VALUES(32,'2025-03-12','Aluguel',63,'aluguel butter',500.0,0.0,500.0,'2025-04-11','pago',0.0,2,0.0,250.0,0);
INSERT INTO servicos VALUES(33,'2025-05-18','Aluguel',28,'Aluguem 120D',150.0,0.0,150.0,'2025-06-17','pago',0.0,1,0.0,150.0,0);
INSERT INTO servicos VALUES(34,'2024-12-10','Aluguel',44,'aluguel ronin 3 dias + handcam 1',1950.0,850.0,1100.0,'2025-01-09','pago',0.0,3,0.0,650.0,0);
INSERT INTO servicos VALUES(35,'2025-01-20','Aluguel',59,'aluguel handcam 4 dias',200.0,0.0,200.0,'2025-02-19','pago',0.0,4,0.0,50.0,0);
INSERT INTO servicos VALUES(36,'2025-04-14','Aluguel',60,'aluguel handcam #1',100.0,0.0,100.0,'2025-05-14','pago',0.0,1,0.0,100.0,1);
INSERT INTO servicos VALUES(37,'2025-09-29','Job',21,'Gravação Denison corrida 4AM',1000.0,0.0,1000.0,'2025-10-29','pago',0.0,1,1000.0,0.0,1);
INSERT INTO servicos VALUES(38,'2025-10-20','Job',64,'Clipe Vitor',2000.0,0.0,2000.0,'2025-11-19','pago',0.0,1,2000.0,0.0,1);
INSERT INTO servicos VALUES(39,'2025-11-06','Job',52,'Sicredi media training',1500.0,0.0,1500.0,'2025-12-06','pendente',1500.0,1,1500.0,0.0,1);
INSERT INTO servicos VALUES(40,'2025-03-11','Job',55,'Yatta switcher Astronauta',2070.0,0.0,2070.0,'2025-04-10','pago',0.0,1,2070.0,0.0,1);
INSERT INTO servicos VALUES(41,'2025-06-02','Job',6,'Colorimetria e versoes do Curta o Trem',2000.0,0.0,2000.0,'2025-07-02','pago',0.0,1,2000.0,0.0,1);
INSERT INTO servicos VALUES(42,'2025-07-01','Job',4,'Edicao edicoes festival pra rodar em exposicao',1200.0,0.0,1200.0,'2025-07-31','pago',0.0,1,1200.0,0.0,1);
INSERT INTO servicos VALUES(43,'2025-04-04','Job',65,'Gravacao que foi só o Denison e Baino pra Petrobras',3800.0,0.0,3800.0,'2025-05-04','pago',0.0,1,3800.0,0.0,1);
INSERT INTO servicos VALUES(44,'2025-03-18','Job',52,'Edicao de Reunioes Online',1500.0,0.0,1500.0,'2025-04-17','pago',0.0,1,1500.0,0.0,1);
INSERT INTO servicos VALUES(45,'2025-03-13','Job',9,'Captacao REFAP Xavica e Denison Petrobras',3850.0,0.0,3850.0,'2025-04-12','pago',0.0,1,3850.0,0.0,1);
INSERT INTO servicos VALUES(46,'2024-12-02','Job',52,'Live sem camera com o Marx de suporte',4500.0,0.0,4500.0,'2025-01-01','pago',0.0,1,4500.0,0.0,1);
INSERT INTO servicos VALUES(47,'2024-11-14','Job',14,'NAT Salame Studio',1500.0,0.0,1500.0,'2024-12-14','pago',0.0,1,1500.0,0.0,1);
INSERT INTO servicos VALUES(48,'2024-11-28','Job',14,'4 dias acao coca cola muros',5500.0,0.0,5500.0,'2024-12-28','pago',0.0,1,5500.0,0.0,1);
INSERT INTO servicos VALUES(49,'2024-12-11','Job',14,'JBL Casa Ricos',1500.0,0.0,1500.0,'2025-01-10','pago',0.0,1,1500.0,0.0,1);
INSERT INTO servicos VALUES(50,'2024-10-26','Job',16,'Curta metragem curso (2 diarias) + Oficina',2100.0,0.0,2100.0,'2024-11-25','pago',0.0,1,2100.0,0.0,1);
INSERT INTO servicos VALUES(51,'2025-01-13','Job',10,'Casa das Carpas C2C',2200.0,0.0,2200.0,'2025-02-12','pago',0.0,1,2200.0,0.0,1);
INSERT INTO servicos VALUES(52,'2025-01-24','Job',21,'Venâncio e Santa Cruz Denison',2637.0,0.0,2637.0,'2025-02-23','pago',0.0,2,1318.5,0.0,1);
INSERT INTO servicos VALUES(53,'2025-01-29','Job',21,'Fiergs Denison (gas+cafe+park)',1000.0,0.0,1000.0,'2025-02-28','pago',0.0,1,1000.0,0.0,1);
INSERT INTO servicos VALUES(54,'2025-01-31','Job',21,'Fiergs Denison',1500.0,0.0,1500.0,'2025-03-02','pago',0.0,1,1500.0,0.0,1);
INSERT INTO servicos VALUES(55,'2025-02-11','Job',10,'C2C Shoping canoas',2500.0,0.0,2500.0,'2025-03-13','pago',0.0,1,1500.0,1000.0,1);
INSERT INTO servicos VALUES(56,'2025-02-18','Job',14,'Catraca SP Campari Inlfuenciadores',8000.0,0.0,8000.0,'2025-03-20','pago',0.0,4,2000.0,0.0,1);
INSERT INTO servicos VALUES(57,'2025-02-27','Job',20,'Aeroporto Daterra',4000.0,0.0,4000.0,'2025-03-29','pago',0.0,2,2000.0,0.0,1);
INSERT INTO servicos VALUES(59,'2025-04-25','Job',14,'Catraca assist stil Alface',1500.0,0.0,1500.0,'2025-05-25','pago',0.0,1,1500.0,0.0,1);
INSERT INTO servicos VALUES(60,'2025-04-26','Job',38,'Oficina Kligman',1000.0,0.0,1000.0,'2025-05-26','pago',0.0,1,1000.0,0.0,1);
INSERT INTO servicos VALUES(61,'2025-06-17','Job',14,'Piloto Gabi Catraca $1k',1000.0,0.0,1000.0,'2025-07-17','pago',0.0,1,1000.0,0.0,1);
INSERT INTO servicos VALUES(62,'2025-06-27','Job',20,'Sirotsky temp2',4000.0,0.0,4000.0,'2025-07-27','pago',0.0,1,4000.0,0.0,1);
INSERT INTO servicos VALUES(63,'2025-06-28','Job',64,'Clipe Maskavo - Eu que nao volto atras',2000.0,0.0,2000.0,'2025-07-28','pago',0.0,1,2000.0,0.0,1);
INSERT INTO servicos VALUES(64,'2025-07-12','Job',55,'Yatta switcher aeroporto',3760.0,0.0,3760.0,'2025-08-11','pago',0.0,2,1880.0,0.0,1);
INSERT INTO servicos VALUES(65,'2025-07-24','Job',14,'Grandene Kids',2000.0,0.0,2000.0,'2025-08-23','pago',0.0,1,1000.0,1000.0,1);
INSERT INTO servicos VALUES(66,'2025-07-26','Job',16,'Curta oficina - O Lugar',3000.0,0.0,3000.0,'2025-08-25','pago',0.0,2,1500.0,0.0,1);
INSERT INTO servicos VALUES(67,'2025-07-30','Job',14,'Sticky Shoes Monge',2000.0,0.0,2000.0,'2025-08-29','pago',0.0,1,1000.0,1000.0,1);
INSERT INTO servicos VALUES(68,'2025-07-31','Job',20,'Praças Mocelini',2000.0,0.0,2000.0,'2025-08-30','pago',0.0,1,2000.0,0.0,1);
INSERT INTO servicos VALUES(69,'2025-08-07','Job',14,'Still Cortadores (lentes cooke, 1200 equipa pelos 2 dias) + 28001AC',4000.0,0.0,4000.0,'2025-09-06','pago',0.0,2,1400.0,600.0,1);
INSERT INTO servicos VALUES(70,'2025-08-11','Job',14,'Still Motores (2300 (equipa) + 2800 1AC)',5100.0,0.0,5100.0,'2025-09-10','pago',0.0,2,1400.0,1150.0,1);
INSERT INTO servicos VALUES(71,'2025-08-19','Job',4,'Festival de música AF',6000.0,0.0,6000.0,'2025-09-18','pago',0.0,1,6000.0,0.0,1);
INSERT INTO servicos VALUES(72,'2025-08-21','Job',5,'Job Caxias 8k (8771 foi equipa mais custos)',8868.0,0.0,8868.0,'2025-09-20','pago',0.0,4,1400.0,817.0,1);
INSERT INTO servicos VALUES(73,'2025-08-29','Job',20,'Daterra 9 tyaxi 2 dias 2400',2400.0,0.0,2400.0,'2025-09-28','pago',0.0,2,1200.0,0.0,1);
INSERT INTO servicos VALUES(74,'2025-09-11','Job',14,'Stihl Autodromo catraca 1870 (300som + 1570 equipa camera) + 900 2ndAC',2050.0,0.0,2050.0,'2025-10-11','pendente',2050.0,1,1400.0,650.0,1);
INSERT INTO servicos VALUES(75,'2025-09-15','Job',20,'Daterra Rosário 2200k',2200.0,0.0,2200.0,'2025-10-15','pendente',2200.0,2,1100.0,0.0,1);
INSERT INTO servicos VALUES(76,'2025-09-16','Job',64,'Clipe Maskavo - Rumo ao Sul',2000.0,0.0,2000.0,'2025-10-16','pendente',2000.0,1,2000.0,0.0,1);
INSERT INTO servicos VALUES(77,'2025-09-22','Job',14,'Vinhos Salton Cozinha (1400 + 600kitlentes + 100saulo + 560hext)',2660.0,0.0,2660.0,'2025-10-22','pendente',2660.0,1,1400.0,1260.0,1);
INSERT INTO servicos VALUES(78,'2025-09-24','Job',21,'Denison live grandene 1k',1000.0,0.0,1000.0,'2025-10-24','pago',0.0,1,1000.0,0.0,1);
INSERT INTO servicos VALUES(79,'2025-10-13','Job',20,'RBS Caminhao Potter',1000.0,0.0,1000.0,'2025-11-12','pendente',1000.0,1,1000.0,0.0,1);
INSERT INTO servicos VALUES(80,'2025-10-15','Job',20,'RBS Supermecado nota 50',1000.0,0.0,1000.0,'2025-11-14','pendente',1000.0,1,1000.0,0.0,1);
INSERT INTO servicos VALUES(81,'2025-10-20','Aluguel',67,'Aluguel Intercom 5 dias',1000.0,100.0,900.0,'2025-11-19','pendente',900.0,5,0.0,200.0,0);
INSERT INTO servicos VALUES(82,'2025-10-22','Aluguel',20,'Aluguel GoPro2210',150.0,0.0,150.0,'2025-11-21','pendente',150.0,1,0.0,150.0,0);
CREATE TABLE pagamentos (
	id INTEGER NOT NULL, 
	servico_id INTEGER, 
	valor_pago FLOAT NOT NULL, 
	data_pagamento DATE, 
	valor_pendente FLOAT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(servico_id) REFERENCES servicos (id)
);
INSERT INTO pagamentos VALUES(1,60,1000.0,'2025-04-26',0.0);
INSERT INTO pagamentos VALUES(2,50,700.0,'2025-01-06',1400.0);
INSERT INTO pagamentos VALUES(3,47,1500.0,'2025-01-07',0.0);
INSERT INTO pagamentos VALUES(4,46,4500.0,'2025-01-10',0.0);
INSERT INTO pagamentos VALUES(5,49,1500.0,'2025-01-13',0.0);
INSERT INTO pagamentos VALUES(6,50,700.0,'2025-01-13',700.0);
INSERT INTO pagamentos VALUES(7,34,1100.0,'2025-10-14',0.0);
INSERT INTO pagamentos VALUES(8,6,150.0,'2025-01-27',0.0);
INSERT INTO pagamentos VALUES(9,35,200.0,'2025-01-30',0.0);
INSERT INTO pagamentos VALUES(10,52,2637.0,'2025-02-13',0.0);
INSERT INTO pagamentos VALUES(11,48,5500.0,'2025-02-14',0.0);
INSERT INTO pagamentos VALUES(12,51,1200.0,'2025-02-14',1000.0);
INSERT INTO pagamentos VALUES(13,51,1000.0,'2025-02-14',0.0);
INSERT INTO pagamentos VALUES(14,4,50.0,'2025-02-17',0.0);
INSERT INTO pagamentos VALUES(15,9,100.0,'2025-02-17',0.0);
INSERT INTO pagamentos VALUES(16,8,250.0,'2025-02-21',0.0);
INSERT INTO pagamentos VALUES(17,5,300.0,'2025-03-03',0.0);
INSERT INTO pagamentos VALUES(18,55,2500.0,'2025-03-11',0.0);
INSERT INTO pagamentos VALUES(19,7,150.0,'2025-03-11',0.0);
INSERT INTO pagamentos VALUES(20,56,8000.0,'2025-03-24',0.0);
INSERT INTO pagamentos VALUES(21,53,1000.0,'2025-03-31',0.0);
INSERT INTO pagamentos VALUES(22,33,150.0,'2025-03-31',0.0);
INSERT INTO pagamentos VALUES(23,57,4000.0,'2025-04-05',0.0);
INSERT INTO pagamentos VALUES(24,3,15250.0,'2025-04-07',45435.0);
INSERT INTO pagamentos VALUES(25,32,500.0,'2025-04-08',0.0);
INSERT INTO pagamentos VALUES(26,44,1500.0,'2025-04-10',0.0);
INSERT INTO pagamentos VALUES(27,45,3850.0,'2025-04-11',0.0);
INSERT INTO pagamentos VALUES(28,40,2070.0,'2025-04-11',0.0);
INSERT INTO pagamentos VALUES(29,11,150.0,'2025-04-11',0.0);
INSERT INTO pagamentos VALUES(30,3,15870.0,'2025-04-16',29565.0);
INSERT INTO pagamentos VALUES(32,13,350.0,'2025-04-29',0.0);
INSERT INTO pagamentos VALUES(33,29,500.0,'2025-04-29',0.0);
INSERT INTO pagamentos VALUES(34,3,15250.0,'2025-05-02',14315.0);
INSERT INTO pagamentos VALUES(35,12,150.0,'2025-05-05',0.0);
INSERT INTO pagamentos VALUES(36,54,1500.0,'2025-05-05',0.0);
INSERT INTO pagamentos VALUES(37,43,3800.0,'2025-05-15',0.0);
INSERT INTO pagamentos VALUES(38,3,17650.0,'2025-05-19',0.0);
INSERT INTO pagamentos VALUES(39,59,1500.0,'2025-06-06',0.0);
INSERT INTO pagamentos VALUES(40,41,2000.0,'2025-06-16',0.0);
INSERT INTO pagamentos VALUES(41,62,2000.0,'2025-07-04',2000.0);
INSERT INTO pagamentos VALUES(42,63,1500.0,'2025-07-17',500.0);
INSERT INTO pagamentos VALUES(43,61,1000.0,'2025-07-21',0.0);
INSERT INTO pagamentos VALUES(44,14,1320.0,'2025-07-24',0.0);
INSERT INTO pagamentos VALUES(45,63,500.0,'2025-07-25',0.0);
INSERT INTO pagamentos VALUES(46,19,500.0,'2025-07-30',0.0);
INSERT INTO pagamentos VALUES(47,42,1200.0,'2025-07-31',0.0);
INSERT INTO pagamentos VALUES(48,62,2000.0,'2025-08-05',0.0);
INSERT INTO pagamentos VALUES(49,16,600.0,'2025-08-05',0.0);
INSERT INTO pagamentos VALUES(50,20,120.0,'2025-08-13',0.0);
INSERT INTO pagamentos VALUES(51,30,3366.0,'2025-08-13',0.0);
INSERT INTO pagamentos VALUES(52,72,4000.0,'2025-08-18',4868.0);
INSERT INTO pagamentos VALUES(53,65,2000.0,'2025-08-25',0.0);
INSERT INTO pagamentos VALUES(54,71,6000.0,'2025-08-29',0.0);
INSERT INTO pagamentos VALUES(55,66,1000.0,'2025-09-03',2000.0);
INSERT INTO pagamentos VALUES(56,68,2095.0,'2025-09-05',0.0);
INSERT INTO pagamentos VALUES(57,67,2000.0,'2025-09-08',0.0);
INSERT INTO pagamentos VALUES(58,26,300.0,'2025-09-10',0.0);
INSERT INTO pagamentos VALUES(59,69,4000.0,'2025-09-19',0.0);
INSERT INTO pagamentos VALUES(60,70,5100.0,'2025-09-19',0.0);
INSERT INTO pagamentos VALUES(61,72,4000.0,'2025-09-21',868.0);
INSERT INTO pagamentos VALUES(62,72,871.2999999999999546,'2025-09-22',0.0);
INSERT INTO pagamentos VALUES(63,31,600.0,'2025-09-23',0.0);
INSERT INTO pagamentos VALUES(64,66,1000.0,'2025-09-23',1000.0);
INSERT INTO pagamentos VALUES(65,78,1000.0,'2025-09-26',0.0);
INSERT INTO pagamentos VALUES(66,66,1155.0,'2025-10-02',0.0);
INSERT INTO pagamentos VALUES(67,37,1000.0,'2025-10-03',0.0);
INSERT INTO pagamentos VALUES(68,73,2520.0,'2025-10-03',0.0);
INSERT INTO pagamentos VALUES(69,27,150.0,'2025-10-03',0.0);
INSERT INTO pagamentos VALUES(70,50,700.0,'2024-12-23',0.0);
INSERT INTO pagamentos VALUES(71,15,200.0,'2025-08-19',0.0);
INSERT INTO pagamentos VALUES(72,36,100.0,'2025-04-28',0.0);
INSERT INTO pagamentos VALUES(73,18,50.0,'2025-07-24',0.0);
INSERT INTO pagamentos VALUES(74,64,3760.0,'2025-08-22',0.0);
INSERT INTO pagamentos VALUES(75,24,100.0,'2025-10-13',0.0);
INSERT INTO pagamentos VALUES(76,21,100.0,'2025-10-13',0.0);
INSERT INTO pagamentos VALUES(77,38,2000.0,'2025-10-22',0.0);
CREATE TABLE custos (
	id INTEGER NOT NULL, 
	servico_id INTEGER NOT NULL, 
	descricao VARCHAR NOT NULL, 
	valor FLOAT NOT NULL, 
	data DATE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(servico_id) REFERENCES servicos (id)
);
INSERT INTO custos VALUES(2,43,'Repasse do valor total do job - imposto',3572.0,'2025-04-04');
INSERT INTO custos VALUES(3,45,'Pagamento de cache 1k denison + 500 xavica',1500.0,'2025-04-11');
INSERT INTO custos VALUES(4,46,'Cache Marx',1000.0,'2025-01-10');
INSERT INTO custos VALUES(5,60,'Ajuste contabilidade, já havia sido pago ano passado',1000.0,'2025-04-26');
INSERT INTO custos VALUES(6,62,'Cache Montiel',750.0,'2025-07-04');
INSERT INTO custos VALUES(7,71,'Cache Gustavo',1000.0,'2025-08-29');
CREATE TABLE clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    cpf_cnpj TEXT, -- substitui a antiga coluna "observacoes"
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO clientes VALUES(2,'Adamo',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(3,'Afonso Teatro',NULL,'(21) 97248-4098',NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(4,'Alianca Francesa',NULL,NULL,NULL,'92.989.359/0001-51','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(5,'Balsa',NULL,NULL,NULL,'28.964.990/0001-05','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(6,'Boca',NULL,NULL,NULL,'902.308.410-15','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(7,'Boia',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(8,'Brooke',NULL,NULL,NULL,'31.537.706/0001-10','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(9,'Buffalo Digital',NULL,NULL,NULL,'27.238.320/0001-30','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(10,'C2 Content',NULL,NULL,NULL,'32.947.102/0001-05','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(11,'Caludia Machado',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(12,'Casa Atomo',NULL,NULL,NULL,'28.695.022/0001-32','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(13,'Casa de Cinema',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(14,'Catraca Filmes',NULL,NULL,NULL,'08.047.810/0001-05','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(15,'Colombo',NULL,'(51) 99943-7436',NULL,'89.848.543/0001-77','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(16,'Comica Cultural',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(17,'Consuelo',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(18,'Consuelo Valandro',NULL,NULL,NULL,'21.123.400/0001-64','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(19,'Consul Engenharia',NULL,NULL,NULL,'04.934.077/0001-90','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(20,'Daterra Studio',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(21,'Denison',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(22,'Deyvison Souza',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(23,'Escala',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(24,'Eyxo',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(25,'Fabio Brun',NULL,'(51) 99754-9421',NULL,'07.445.020/0001-15','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(26,'Fernando Kike',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(27,'Gabriel Aydos',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(28,'Gabriel Xavica',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(29,'Gogaca Producoes',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(30,'Gordo',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(31,'Guilherme Castro',NULL,NULL,NULL,'72.430.044/0001-62','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(32,'Gustavo LightHouse',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(33,'Jeferson',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(34,'Lazari',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(35,'Leo da Silva Moura',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(36,'Liege',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(37,'Little Door',NULL,NULL,NULL,'23.774.077/0001-14','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(38,'Marcus Kligman',NULL,NULL,NULL,'24.975.250/0001-05','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(39,'Maria Elena',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(40,'Mario Cesar',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(41,'Marx',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(42,'Metamorfose',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(43,'Modus Vivendi',NULL,NULL,NULL,'05.893.950/0001-06','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(44,'Pablo Arte','','',NULL,'','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(45,'Peralta',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(46,'Producao Brasilia',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(47,'Querosene',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(48,'Rodrigo',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(49,'Sailor Studio',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(50,'Saulo Fietz',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(51,'Shandler',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(52,'Sicredi',NULL,NULL,NULL,'07.430.210/0001-69','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(53,'Tamborim Filmes',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(54,'Titi',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(55,'Yata',NULL,NULL,NULL,NULL,'2025-10-06 13:27:50');
INSERT INTO clientes VALUES(56,'Unisuper',NULL,NULL,NULL,'04.127.398/0001-82','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(57,'Brothers',NULL,NULL,NULL,'10.764.243/0001-50','2025-10-06 13:27:50');
INSERT INTO clientes VALUES(59,'Pedro Mochileiro','','',NULL,'','2025-10-10 21:44:51');
INSERT INTO clientes VALUES(60,'Bruno Poliverso','','',NULL,'','2025-10-11 16:44:06');
INSERT INTO clientes VALUES(61,'Pedro Rocha','','',NULL,'','2025-10-11 18:17:46');
INSERT INTO clientes VALUES(62,'Black Media','','',NULL,'','2025-10-11 18:36:54');
INSERT INTO clientes VALUES(63,'Rodrigo Cunha','','',NULL,'','2025-10-11 18:38:04');
INSERT INTO clientes VALUES(64,'Estudio Hermes','','',NULL,'','2025-10-11 18:45:28');
INSERT INTO clientes VALUES(65,'Lead Acessoria','','',NULL,'','2025-10-11 18:49:51');
INSERT INTO clientes VALUES(66,'Teestche','','',NULL,'','2025-10-14 22:23:40');
INSERT INTO clientes VALUES(67,'Ausgang','','',NULL,'','2025-10-22 18:01:28');
CREATE TABLE servico_equipamentos (
  id INTEGER PRIMARY KEY,
  servico_id INTEGER NOT NULL,
  equipamento_id INTEGER NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unit_diaria REAL NOT NULL DEFAULT 0.0,
  subtotal_diaria REAL NOT NULL DEFAULT 0.0,
  FOREIGN KEY(servico_id) REFERENCES servicos(id) ON DELETE CASCADE,
  FOREIGN KEY(equipamento_id) REFERENCES equipamentos(id) ON DELETE RESTRICT
);
INSERT INTO servico_equipamentos VALUES(3,3,1,2,350.0,700.0);
INSERT INTO servico_equipamentos VALUES(4,3,2,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(5,3,3,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(6,3,4,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(7,3,5,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(8,3,6,1,200.0,200.0);
INSERT INTO servico_equipamentos VALUES(9,3,7,1,600.0,600.0);
INSERT INTO servico_equipamentos VALUES(10,3,8,1,180.0,180.0);
INSERT INTO servico_equipamentos VALUES(11,3,9,1,180.0,180.0);
INSERT INTO servico_equipamentos VALUES(12,3,11,1,180.0,180.0);
INSERT INTO servico_equipamentos VALUES(13,3,10,1,180.0,180.0);
INSERT INTO servico_equipamentos VALUES(14,3,12,1,180.0,180.0);
INSERT INTO servico_equipamentos VALUES(15,3,14,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(16,3,13,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(17,3,15,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(18,3,16,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(19,3,17,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(20,3,18,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(21,3,19,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(22,3,20,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(23,3,21,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(24,3,22,1,30.0,30.0);
INSERT INTO servico_equipamentos VALUES(25,3,23,1,30.0,30.0);
INSERT INTO servico_equipamentos VALUES(26,3,24,1,30.0,30.0);
INSERT INTO servico_equipamentos VALUES(27,3,25,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(28,3,26,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(29,3,28,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(30,3,27,1,105.0,105.0);
INSERT INTO servico_equipamentos VALUES(31,3,30,1,200.0,200.0);
INSERT INTO servico_equipamentos VALUES(32,3,29,1,200.0,200.0);
INSERT INTO servico_equipamentos VALUES(33,3,31,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(34,3,32,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(35,3,33,1,200.0,200.0);
INSERT INTO servico_equipamentos VALUES(36,3,34,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(37,3,35,1,250.0,250.0);
INSERT INTO servico_equipamentos VALUES(38,3,36,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(39,3,37,1,75.0,75.0);
INSERT INTO servico_equipamentos VALUES(40,3,38,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(41,3,39,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(42,3,40,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(43,3,41,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(44,3,42,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(45,3,43,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(46,3,44,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(47,3,45,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(48,3,46,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(49,3,47,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(50,3,48,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(51,3,49,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(52,3,50,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(53,3,51,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(54,3,52,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(55,3,53,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(56,3,54,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(57,3,55,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(58,3,56,1,30.0,30.0);
INSERT INTO servico_equipamentos VALUES(59,3,57,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(60,3,58,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(61,3,59,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(62,3,60,1,120.0,120.0);
INSERT INTO servico_equipamentos VALUES(63,3,61,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(64,3,62,1,60.0,60.0);
INSERT INTO servico_equipamentos VALUES(65,3,63,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(66,3,64,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(67,3,65,1,250.0,250.0);
INSERT INTO servico_equipamentos VALUES(68,3,66,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(69,3,67,1,300.0,300.0);
INSERT INTO servico_equipamentos VALUES(70,3,68,1,200.0,200.0);
INSERT INTO servico_equipamentos VALUES(71,3,69,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(72,3,70,1,300.0,300.0);
INSERT INTO servico_equipamentos VALUES(73,3,71,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(74,3,72,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(75,3,73,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(76,3,74,5,30.0,150.0);
INSERT INTO servico_equipamentos VALUES(77,3,75,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(78,3,76,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(79,3,77,1,20.0,20.0);
INSERT INTO servico_equipamentos VALUES(80,3,78,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(81,3,79,3,10.0,30.0);
INSERT INTO servico_equipamentos VALUES(82,3,80,7,10.0,70.0);
INSERT INTO servico_equipamentos VALUES(83,3,81,3,5.0,15.0);
INSERT INTO servico_equipamentos VALUES(84,3,82,2,5.0,10.0);
INSERT INTO servico_equipamentos VALUES(85,3,83,3,10.0,30.0);
INSERT INTO servico_equipamentos VALUES(86,3,84,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(87,3,85,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(88,3,86,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(89,3,87,2,10.0,20.0);
INSERT INTO servico_equipamentos VALUES(90,3,88,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(91,3,90,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(92,3,91,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(93,3,89,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(94,3,92,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(95,3,93,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(96,3,94,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(97,3,95,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(98,3,96,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(99,3,97,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(100,3,98,8,5.0,40.0);
INSERT INTO servico_equipamentos VALUES(101,3,99,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(102,3,100,3,10.0,30.0);
INSERT INTO servico_equipamentos VALUES(103,3,101,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(104,3,102,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(105,3,103,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(106,3,104,4,80.0,320.0);
INSERT INTO servico_equipamentos VALUES(107,3,105,1,80.0,80.0);
INSERT INTO servico_equipamentos VALUES(108,3,106,4,30.0,120.0);
INSERT INTO servico_equipamentos VALUES(109,3,107,1,30.0,30.0);
INSERT INTO servico_equipamentos VALUES(110,3,108,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(111,4,109,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(112,5,67,1,300.0,300.0);
INSERT INTO servico_equipamentos VALUES(114,7,66,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(115,8,32,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(116,8,40,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(117,8,76,2,50.0,100.0);
INSERT INTO servico_equipamentos VALUES(118,9,109,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(120,11,4,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(122,13,36,4,50.0,200.0);
INSERT INTO servico_equipamentos VALUES(123,13,42,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(124,16,36,4,50.0,200.0);
INSERT INTO servico_equipamentos VALUES(126,19,4,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(127,20,88,4,10.0,40.0);
INSERT INTO servico_equipamentos VALUES(129,23,1,1,350.0,350.0);
INSERT INTO servico_equipamentos VALUES(130,24,54,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(131,25,67,1,300.0,300.0);
INSERT INTO servico_equipamentos VALUES(132,26,4,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(133,27,3,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(134,28,67,1,300.0,300.0);
INSERT INTO servico_equipamentos VALUES(135,29,36,4,50.0,200.0);
INSERT INTO servico_equipamentos VALUES(136,30,35,1,250.0,250.0);
INSERT INTO servico_equipamentos VALUES(137,30,37,2,75.0,150.0);
INSERT INTO servico_equipamentos VALUES(138,30,74,5,30.0,150.0);
INSERT INTO servico_equipamentos VALUES(139,30,75,1,100.0,100.0);
INSERT INTO servico_equipamentos VALUES(140,30,76,2,50.0,100.0);
INSERT INTO servico_equipamentos VALUES(141,30,78,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(142,30,80,7,10.0,70.0);
INSERT INTO servico_equipamentos VALUES(143,30,81,3,5.0,15.0);
INSERT INTO servico_equipamentos VALUES(144,30,82,2,5.0,10.0);
INSERT INTO servico_equipamentos VALUES(145,30,83,3,10.0,30.0);
INSERT INTO servico_equipamentos VALUES(146,30,84,3,10.0,30.0);
INSERT INTO servico_equipamentos VALUES(147,30,85,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(148,30,86,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(149,30,87,2,10.0,20.0);
INSERT INTO servico_equipamentos VALUES(150,30,91,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(151,30,99,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(152,30,100,4,10.0,40.0);
INSERT INTO servico_equipamentos VALUES(153,30,102,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(154,30,103,1,10.0,10.0);
INSERT INTO servico_equipamentos VALUES(155,31,70,1,300.0,300.0);
INSERT INTO servico_equipamentos VALUES(156,32,76,2,50.0,100.0);
INSERT INTO servico_equipamentos VALUES(157,32,78,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(158,33,32,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(159,34,68,3,200.0,600.0);
INSERT INTO servico_equipamentos VALUES(160,34,109,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(161,35,109,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(163,6,4,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(164,12,4,1,150.0,150.0);
INSERT INTO servico_equipamentos VALUES(166,18,109,1,50.0,50.0);
INSERT INTO servico_equipamentos VALUES(167,81,30,1,200.0,200.0);
INSERT INTO servico_equipamentos VALUES(168,82,3,1,150.0,150.0);
INSERT INTO sqlite_sequence VALUES('clientes',67);
CREATE INDEX ix_equipamentos_nome ON equipamentos (nome);
CREATE INDEX ix_equipamentos_id ON equipamentos (id);
CREATE INDEX ix_servicos_id ON servicos (id);
CREATE INDEX ix_pagamentos_id ON pagamentos (id);
CREATE INDEX ix_custos_id ON custos (id);
CREATE UNIQUE INDEX uq_servico_equip
  ON servico_equipamentos(servico_id, equipamento_id);
CREATE INDEX ix_servico_equip_servico_id
  ON servico_equipamentos(servico_id);
CREATE INDEX ix_servico_equip_equipamento_id
  ON servico_equipamentos(equipamento_id);
COMMIT;
