create table user(
    id int primary key AUTO_INCREMENT,
    name varchar (250),
    contactNumber varchar(50),
    email varchar(25),
    password varchar(250),
    status varchar(20),
    role varchar(20),
    UNIQUE (email)

);
insert into user (name,contactNumber,email,password,status,role) values ('Admin', '123456434', 'admin@gmail.com', '123456','true', 'admin');