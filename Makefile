FILES=./index.html ./manifest.appcache ./manifest.webapp ./images/* ./js/* ./locales/* ./shared/* ./style/*
zip:
	zip -r notes.zip `echo ${FILES}`