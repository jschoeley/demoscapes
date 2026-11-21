# specify packages used by project and the repositories from which
# they should be installed
# to find the project dependencies run
# dput(unique(renv::dependencies()$Package))
packages <- list(
  cran = list(
    url = "https://cloud.r-project.org/",
    packages = c(
      "ISOcodes",
      "yaml",
      "dplyr",
      "qs2",
      "tidyr",
      "here",
      "osfr",
      "readr",
      "stringr",
      "HMDHFDplus",
      "DemoKin"
    )
  )
)

# install/update packages
lapply(packages, function(X) install.packages(X$packages, repos = X$url))

# write out list of dependencies and currently used versions
versions <- installed.packages()[
  unlist(lapply(packages, function(X) X$packages)),
  c("Package", "Version")
]
write.csv(versions, "./out/_package_versions.csv", row.names = FALSE)
